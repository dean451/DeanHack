/* Experimental JSON window port. NetHack license applies; see dat/license. */
#include "hack.h"
#include "dlb.h"
#include "func_tab.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#if defined(TTY_GRAPHICS) && defined(TEXTCOLOR)
/* With tty compiled in, mapglyph() asks the tty's has_color(), which only says yes for colours
   the tty terminal set up an escape for. The bridge never starts the tty, so every glyph came out
   NO_COLOR. Give each colour a (never printed) escape so glyph colours come through. */
extern NEARDATA char *hilites[CLR_MAX];
static char no_escape[]="";
#endif

#define BW 32
#define BM 512
struct entry {
    anything id;
    char *text;
    boolean selectable;
    char accelerator;
    char group_accelerator;
};
struct bwin { int type, n; struct entry items[BM]; char prompt[BUFSZ]; };
static struct bwin wins[BW];
static int glyphs[COLNO][ROWNO], backgrounds[COLNO][ROWNO];
static long request_id;
static void quoted(const char *s) {
    const unsigned char *p=(const unsigned char *)(s?s:"");
    putchar('"');
    for (;*p;p++) { if (*p=='"'||*p=='\\') {putchar('\\');putchar(*p);} else if (*p<32 || *p>=127) printf("\\u%04x",*p); else putchar(*p); }
    putchar('"');
}
static void event(const char *kind,const char *text) { printf("{\"type\":");quoted(kind);printf(",\"text\":");quoted(text);puts("}");fflush(stdout); }
static const char *terrain(int glyph) {
    int c=glyph_to_cmap(glyph);
    if(!glyph_is_cmap(glyph) || c==S_stone) return "unknown";
    if(c>=S_vwall && c<=S_trwall) return "wall";
    if(c==S_vcdoor || c==S_hcdoor) return "door";
    if(c==S_bars) return "bars";
    if(c==S_fountain) return "fountain";
    if(c==S_altar) return "altar";
    if(c==S_throne) return "throne";
    if(c==S_sink) return "sink";
    if(c==S_grave) return "grave";
    if(c==S_upstair || c==S_upladder) return "up";
    if(c==S_dnstair || c==S_dnladder) return "down";
    if(c==S_pool || c==S_water) return "water";
    if(c==S_lava) return "lava";
    if(c==S_tree || c==S_deadtree) return "tree";
    if(c>=S_room && c<=S_litcorr) return "floor";
    if(c==S_ndoor || c==S_vodoor || c==S_hodoor) return "floor";
    return "feature";
}
/* get_bk_glyph() only knows floor, corridor, water, lava, ice, air and cloud, and calls
   everything else S_room. So a throne, altar, stairs, sink, grave, fountain, tree or doorway
   under the hero, a monster or an item read as bare floor and dropped out of the render.
   Under an occupant, use what the hero remembers there when that is furniture, and on the
   hero's own square what they stand on. Nothing here is more than the tty map or a ':' look
   shows: an item lying on unseen furniture still hides it, as it does on the tty map. */
static int under_glyph(int x,int y,int b) {
    int m=levl[x][y].glyph,c;
    if (b!=cmap_to_glyph(S_room)) return b;
    if (x==u.ux && y==u.uy && !Blind && !u.uswallow && !Underwater) m=back_to_glyph(x,y);
    if (!glyph_is_cmap(m)) return b;
    c=glyph_to_cmap(m);
    if (c==S_fountain || c==S_altar || c==S_throne || c==S_sink || c==S_grave ||
        c==S_upstair || c==S_dnstair || c==S_upladder || c==S_dnladder ||
        c==S_tree || c==S_deadtree || c==S_ndoor || c==S_vodoor || c==S_hodoor) return m;
    return b;
}
static const char *object_kind(int glyph) {
    if (glyph_is_statue(glyph) || (glyph_is_object(glyph) && glyph_to_obj(glyph)==STATUE)) return "statue";
    if (glyph_is_body(glyph)) return "corpse";
    if (!glyph_is_object(glyph)) return "";
    return "item";
}
static const char *object_name(int glyph) {
    int o;
    if (glyph_is_body(glyph)) {
        o = glyph - GLYPH_BODY_OFF;
        return (o >= 0 && o < NUMMONS) ? mons[o].mname : "corpse";
    }
    o = glyph_to_obj(glyph);
    return (o >= 0 && o < NUM_OBJECTS) ? OBJ_NAME(objects[o]) : "item";
}
/* The name as the hero knows it ("ruby potion" until identified), so the client can
   caption items without revealing their true type. */
static const char *seen_name(int glyph,int x,int y) {
    static char buf[BUFSZ];
    struct obj *top;
    char *paren;
    int o=glyph_to_obj(glyph);
    if (glyph_is_body(glyph) || o<0 || o>=NUM_OBJECTS) return object_name(glyph);
    top=vobj_at(x,y);
    if (cansee(x,y) && !Hallucination && top && top->otyp==o) return distant_name(top,xname);
    /* Remembered objects: obj_typename() appends "(appearance)" once identified. */
    if (o==GOLD_PIECE) return "gold pieces";
    Strcpy(buf,obj_typename(o));
    if ((paren=strstr(buf," (")) != 0 && buf[strlen(buf)-1]==')') *paren='\0';
    return buf;
}
/* True when the hero is looking at the top object here and knows exactly what it is.
   The Amulet of Yendor and its fakes read the same until each one is identified on its
   own (obj->known), so only this tells the real, known Amulet apart for the client. */
static boolean seen_identified(int glyph,int x,int y) {
    struct obj *top;
    int o=glyph_to_obj(glyph);
    if (glyph_is_body(glyph) || o<0 || o>=NUM_OBJECTS || !cansee(x,y) || Hallucination) return FALSE;
    top=vobj_at(x,y);
    if (!top || top->otyp!=o || !top->dknown) return FALSE;
    if (o==AMULET_OF_YENDOR || o==FAKE_AMULET_OF_YENDOR) return top->known;
    return objects[o].oc_name_known;
}
/* FX stream: tmp_at() sequences (beams, thrown objects, explosions) are buffered as
   steps and sent as one {"type":"fx"} event when the outermost sequence ends, so the
   client can replay what the map frames only show the end of. "tick" steps are
   delay_output() pauses. Only glyphs tmp_at() actually draws (seen by the hero) are
   recorded. */
#define FX_BUF 65536
static char fxbuf[FX_BUF];
static int fxlen,fxdepth,fxsteps,fxfull;
static void fx_printf(const char *fmt,...) {
    va_list ap;int n;
    if(fxfull)return;
    va_start(ap,fmt);n=vsnprintf(fxbuf+fxlen,FX_BUF-fxlen,fmt,ap);va_end(ap);
    if(n<0||n>=FX_BUF-fxlen-64){fxbuf[fxlen]=0;fxfull=1;}else fxlen+=n;
}
static void fx_quoted(const char *s) {
    const unsigned char *p=(const unsigned char *)(s?s:"");
    fx_printf("\"");
    for(;*p;p++){if(*p=='"'||*p=='\\')fx_printf("\\%c",*p);else if(*p<32||*p>=127)fx_printf("\\u%04x",*p);else fx_printf("%c",*p);}
    fx_printf("\"");
}
/* A step is written in pieces; if the buffer fills part way, fx_close() drops it whole. */
static int fxmark;
static void fx_step(const char *op) {fxmark=fxlen;fx_printf("%s{\"op\":\"%s\"",fxsteps?",":"",op);}
static void fx_close(void) {
    fx_printf("}");
    if(fxfull){fxlen=fxmark;fxbuf[fxlen]=0;}else fxsteps++;
}
static void fx_glyph(int g) {
    static const char *zaps[NUM_ZAP]={"magic missile","fire","cold","sleep","death","lightning","poison gas","lava","acid"};
    static const char *dirs[4]={"vertical","horizontal","lslant","rslant"};
    static const char *expls[EXPL_MAX]={"dark","noxious","muddy","wet","magical","fiery","frosty"};
    fx_printf(",\"glyph\":%d,\"effect\":{\"kind\":",g);
    if(g>=GLYPH_ZAP_OFF&&g<GLYPH_ZAP_OFF+(NUM_ZAP<<2)){
        fx_printf("\"zap\",\"zap\":");fx_quoted(zaps[(g-GLYPH_ZAP_OFF)>>2]);
        fx_printf(",\"dir\":\"%s\"",dirs[(g-GLYPH_ZAP_OFF)&3]);
    } else if(g>=GLYPH_EXPLODE_OFF&&g<GLYPH_ZAP_OFF){
        fx_printf("\"explosion\",\"explosion\":\"%s\",\"part\":%d",expls[(g-GLYPH_EXPLODE_OFF)/MAXEXPCHARS],(g-GLYPH_EXPLODE_OFF)%MAXEXPCHARS);
    } else if(glyph_is_object(g)&&!glyph_is_body(g)&&!glyph_is_statue(g)){
        int o=glyph_to_obj(g);
        fx_printf("\"object\",\"otyp\":%d,\"class\":%d,\"material\":%d",o,objects[o].oc_class,objects[o].oc_material);
        if(OBJ_DESCR(objects[o])){fx_printf(",\"appearance\":");fx_quoted(OBJ_DESCR(objects[o]));}
        /* How a thrown weapon flies. Every appearance of a type shares its skill, so this
           says no more than the glyph does. */
        if(objects[o].oc_class==WEAPON_CLASS){
            int sk=objects[o].oc_skill;
            const char *shape=sk==-P_BOW?"arrow":sk==-P_CROSSBOW?"bolt":sk==-P_DART?"dart":sk==-P_SHURIKEN?"shuriken":
                sk==-P_SLING?"stone":sk==P_DAGGER||sk==P_KNIFE?"dagger":sk==P_SPEAR||sk==P_TRIDENT||sk==P_LANCE?"spear":"weapon";
            fx_printf(",\"shape\":\"%s\"",shape);
        }
    } else if(glyph_is_monster(g)&&glyph_to_mon(g)>=0&&glyph_to_mon(g)<NUMMONS){
        fx_printf("\"monster\",\"name\":");fx_quoted(mons[glyph_to_mon(g)].mname);
    } else if(glyph_is_cmap(g)){
        int c=glyph_to_cmap(g);
        const char *k=c==S_digbeam?"dig":c==S_flashbeam?"flash":(c==S_boomleft||c==S_boomright)?"boomerang":(c>=S_ss1&&c<=S_ss4)?"sparkle":c==S_poisoncloud?"poison cloud":"cmap";
        fx_printf("\"%s\",\"cmap\":%d",k,c);
        if(c>=S_ss1&&c<=S_ss4)fx_printf(",\"part\":%d",c-S_ss1);
    } else fx_printf("\"other\"");
    fx_printf("}");
}
static void fx_flush(void) {
    if(!fxsteps){fxlen=fxfull=0;return;}
    printf("{\"type\":\"fx\",\"open\":%d,\"truncated\":%s,\"steps\":[%s]}\n",fxdepth,fxfull?"true":"false",fxbuf);fflush(stdout);
    fxlen=fxsteps=fxfull=0;fxbuf[0]=0;
}
static void fx_hook(int op,coordxy x,coordxy y,int g) {
    static const char *modes[]={"","beam","all","tether","flash","always"};
    if(op<=DISP_BEAM&&op>=DISP_ALWAYS){
        fxdepth++;fx_step("start");fx_printf(",\"mode\":\"%s\"",modes[-op]);fx_glyph(g);fx_close();
    } else if(op==DISP_CHANGE){fx_step("change");fx_glyph(g);fx_close();}
    else if(op==DISP_END){
        fx_step("end");fx_close();
        if(fxdepth>0&&--fxdepth==0)fx_flush();
    } else if(op==TMP_AT_DRAW||op==TMP_AT_RETRACT){
        fx_step(op==TMP_AT_DRAW?"draw":"retract");fx_printf(",\"x\":%d,\"z\":%d",x,y);fx_close();
    }
}
static void fx_delay(void){if(fxdepth>0){fx_step("tick");fx_close();}}
/* Combat stream: one {"type":"combat"} line per melee attack as it happens (before its
   messages), and {"type":"death"} when a monster dies, so the client can animate swings,
   bites and deaths instead of matching message text. Only what the hero can perceive is
   sent: a monster the hero can't spot has no name, and a fight between two unseen
   monsters, or an unseen death, sends nothing. Names are withheld while hallucinating. */
static const char *attack_name(int at) {
    switch(at){
    case AT_CLAW:return "claw";case AT_BITE:return "bite";case AT_KICK:return "kick";case AT_BUTT:return "butt";
    case AT_TUCH:return "touch";case AT_STNG:return "sting";case AT_HUGS:return "hug";case AT_SPIT:return "spit";
    case AT_ENGL:return "engulf";case AT_BREA:return "breath";case AT_EXPL:return "explode";case AT_BOOM:return "boom";
    case AT_GAZE:return "gaze";case AT_TENT:return "tentacle";case AT_SCRE:return "scream";case AT_WEAP:return "weapon";
    case AT_MAGC:return "magic";default:return "other";
    }
}
static void combat_actor(const char *key,struct monst *m) {
    printf(",\"%s\":",key);
    if(m==&youmonst){printf("{\"you\":true,\"x\":%d,\"z\":%d}",u.ux,u.uy);return;}
    if(!canspotmon(m)){printf("{\"seen\":false}");return;}
    printf("{\"seen\":true,\"x\":%d,\"z\":%d,\"name\":",m->mx,m->my);
    if(Hallucination)printf("null");else quoted(m->data->mname);
    printf(",\"pet\":%s}",m->mtame?"true":"false");
}
static void combat_hook_bridge(struct monst *agr,struct monst *def,int at,int res) {
    struct obj *w=0;
    boolean agr_seen=agr==&youmonst||canspotmon(agr),def_seen=def==&youmonst||canspotmon(def);
    if(!agr_seen&&!def_seen)return;
    if(res==COMBAT_WILDMISS&&!agr_seen)return; /* nothing says where it came from */
    printf("{\"type\":\"combat\",\"attack\":\"%s\",\"result\":\"%s\"",attack_name(at),res==COMBAT_HIT?"hit":res==COMBAT_WILDMISS?"wild":"miss");
    combat_actor("attacker",agr);combat_actor("defender",def);
    if(at==AT_WEAP&&agr_seen)w=agr==&youmonst?uwep:MON_WEP(agr);
    if(w){
        int d=objects[w->otyp].oc_dir;boolean wep=w->oclass==WEAPON_CLASS||is_weptool(w);
        printf(",\"weapon\":{\"otyp\":%d,\"class\":%d,\"material\":%d,\"blow\":\"%s\"}",w->otyp,w->oclass,objects[w->otyp].oc_material,!wep?"blunt":(d&SLASH)?"slash":(d&PIERCE)?"pierce":"blunt");
    }
    puts("}");fflush(stdout);
}
static void death_hook_bridge(struct monst *m,struct permonst *ptr) {
    if(m->mx<=0||!canspotmon(m))return;
    printf("{\"type\":\"death\",\"x\":%d,\"z\":%d,\"name\":",m->mx,m->my);
    if(Hallucination||!ptr)printf("null");else quoted(ptr->mname);
    /* Turned to stone: monstone() leaves the statue on the square before the monster dies, so a
       fresh statue of this monster there means it was petrified (two weeping angels locking
       eyes, a cockatrice). The hero sees the statue on the next frame anyway. */
    if(!Hallucination&&ptr){struct obj *o;for(o=level.objects[m->mx][m->my];o;o=o->nexthere)
        if(o->otyp==STATUE&&o->corpsenm==monsndx(ptr)&&o->age==monstermoves){printf(",\"stoned\":true");break;}}
    printf(",\"pet\":%s}\n",m->mtame?"true":"false");fflush(stdout);
}
/* A wielded object. An artifact is shown by its name, so "base" also names its object type
   (its appearance while the type is unidentified) for the model to follow. */
/* What the hero already knows of a weapon's magic: its enchantment once o->known, and
   whether it is blessed or cursed once o->bknown. Never more than doname() would show. */
static void known_magic(struct obj *o) {
    if (o->known && (o->oclass==WEAPON_CLASS || is_weptool(o))) printf(",\"spe\":%d",o->spe);
    if (o->bknown) printf(",\"buc\":\"%s\"",o->blessed?"blessed":o->cursed?"cursed":"uncursed");
}
static void held(struct obj *o) {
    if (!o) {printf("null");return;}
    printf("{\"name\":");quoted(xname(o));
    printf(",\"otyp\":%d,\"class\":%d",o->otyp,o->oclass);
    known_magic(o);
    if (o->oartifact) {
        const char *d=OBJ_DESCR(objects[o->otyp]);
        printf(",\"base\":");quoted(d&&!objects[o->otyp].oc_name_known?d:OBJ_NAME(objects[o->otyp]));
    }
    putchar('}');
}
/* {"type":"revive"} when a corpse gets up again (a troll, undead turning, a zombie
   digging out): where the monster now stands, where the corpse was and what held it, so
   the client can raise the body off the floor instead of popping a monster in. Only sent
   when the hero can spot the risen monster. */
static void revive_hook_bridge(struct monst *m,struct obj *corpse) {
    const char *where;coordxy fx,fy;
    if(m->mx<=0||!canspotmon(m))return;
    /* ox,oy go stale once the corpse is carried; ask where it really is */
    if(!get_obj_location(corpse,&fx,&fy,CONTAINED_TOO|BURIED_TOO))fx=m->mx,fy=m->my;
    switch(corpse->where){
    case OBJ_FLOOR:where="floor";break;case OBJ_INVENT:where="invent";break;
    case OBJ_MINVENT:where="minvent";break;case OBJ_BURIED:where="buried";break;
    case OBJ_CONTAINED:where="contained";break;default:where="other";break;
    }
    printf("{\"type\":\"revive\",\"x\":%d,\"z\":%d,\"from\":{\"x\":%d,\"z\":%d},\"where\":\"%s\",\"name\":",m->mx,m->my,fx,fy,where);
    if(Hallucination)printf("null");else quoted(m->data->mname);
    printf(",\"pet\":%s}\n",m->mtame?"true":"false");fflush(stdout);
}
/* How a magic portal should look, from either of its ends: the icy way to Sheol, the quest
   portal, Fort Ludios, the Planes. Only asked about portals the hero has seen. */
static const char *portal_style(struct trap *t) {
    if(In_sheol(&t->dst)||In_sheol(&u.uz))return "sheol";
    if(In_quest(&t->dst)||In_quest(&u.uz))return "quest";
    if(Is_knox(&t->dst)||Is_knox(&u.uz))return "ludios";
    if(In_endgame(&t->dst)||In_endgame(&u.uz))return "planes";
    return "other";
}
static const char *engraving_kind(int type) {
    switch(type){case DUST:return "dust";case ENGRAVE:return "engrave";case BURN:return "burn";
    case MARK:return "mark";case ENGR_BLOOD:return "blood";default:return "other";}
}
static void frame(void) {
    int x,y,g,b,m,col,terrain_glyph,object_type;glyph_t ch;unsigned special;
    printf("{\"type\":\"frame\",\"turn\":%ld,\"depth\":%d,\"branch\":%d,\"dungeon\":",moves,depth(&u.uz),u.uz.dnum);
    quoted(dungeons[u.uz.dnum].dname);
    /* the special level's prototype name ("medusa", "orcus", "tower1"...), or "" */
    {s_level *sp=Is_special(&u.uz);printf(",\"special\":");quoted(sp?sp->proto:"");}
    printf(",\"player\":{\"x\":%d,\"z\":%d,\"hp\":%d,\"maxhp\":%d,\"ac\":%d,\"level\":%d,\"weapon\":",u.ux,u.uy,Upolyd?u.mh:u.uhp,Upolyd?u.mhmax:u.uhpmax,u.uac,u.ulevel);
    held(uwep);
    /* Two-weaponing: the other hand holds the alternate weapon. */
    printf(",\"offhand\":");held(u.twoweap?uswapwep:0);
    printf(",\"shield\":");
    if (uarms) {
        printf("{\"name\":");quoted(xname(uarms));
        printf(",\"otyp\":%d}",uarms->otyp);
    } else printf("null");
    /* Invisible to the eye: exactly when the map hides the hero's own glyph (canseeself()),
       so it tells the player nothing the tty display doesn't. Blind heroes still show. */
    printf(",\"invisible\":%s",(!Blind && !u.uswallow && Invisible)?"true":"false");
    printf(",\"helmet\":");
    if (uarmh) {
        printf("{\"name\":");quoted(xname(uarmh));
        printf(",\"otyp\":%d}",uarmh->otyp);
    } else printf("null");
    /* Swallowed: the map is cleared down to the 3x3 swallow border, so say who holds us.
       No name while blind ("It engulfs you!") or hallucinating. */
    if (u.uswallow && u.ustuck) {
        printf(",\"engulfer\":{\"name\":");
        if (Blind || Hallucination) printf("null"); else quoted(u.ustuck->data->mname);
        putchar('}');
    }
    /* Held but not swallowed (an eel's coils, an owlbear's hug, a lichen): where the holder
       stands. holding is true when it's us doing the sticking (polymorphed into a lichen). */
    else if (u.ustuck) {
        printf(",\"stuck\":{\"x\":%d,\"z\":%d,\"holding\":%s}",u.ustuck->mx,u.ustuck->my,
               sticks(youmonst.data)?"true":"false");
    }
    printf("},\"ground\":[");
    {
        struct obj *ground;
        boolean first_ground=TRUE;
        if (!Blind && !u.uswallow && !is_pool(u.ux,u.uy))
        for (ground=level.objects[u.ux][u.uy];ground;ground=ground->nexthere) {
            if (!first_ground) putchar(',');
            first_ground=FALSE;quoted(doname(ground));
        }
    }
    printf("],\"cells\":[");
    boolean first=TRUE;
    for(y=0;y<ROWNO;y++) for(x=1;x<COLNO;x++) {
        g=glyphs[x][y]; if(g<0)continue;b=backgrounds[x][y];
        if(!first)putchar(',');first=FALSE;
        /* Some generated levels carry stale wall mode bits that the legacy
           tile renderer reports as an "original author" panic. The bridge
           is glyph based, so a neutral wall mode is the correct fallback. */
        if ((levl[x][y].typ == HWALL || levl[x][y].typ == VWALL ||
             levl[x][y].typ == SDOOR || levl[x][y].typ == TLCORNER ||
             levl[x][y].typ == TRCORNER || levl[x][y].typ == BLCORNER ||
             levl[x][y].typ == BRCORNER) &&
            (levl[x][y].wall_info & WM_MASK) > 2)
            levl[x][y].wall_info &= ~WM_MASK;
        mapglyph(g,&ch,&col,&special,x,y,0);
        terrain_glyph = glyph_is_cmap(g) ? g : under_glyph(x,y,b);
        printf("{\"x\":%d,\"z\":%d,\"glyph\":%d,\"symbol\":%d,\"color\":%d,\"visible\":%s,\"remembered\":%s,\"terrain\":",x,y,g,ch,col,cansee(x,y)?"true":"false",levl[x][y].seenv?"true":"false");quoted(terrain(terrain_glyph));
        /* Anonymous remembered presence, not physical invisibility of a
           monster legitimately perceived through see-invisible/telepathy. */
        if(glyph_is_cmap(terrain_glyph)&&(glyph_to_cmap(terrain_glyph)==S_vodoor||glyph_to_cmap(terrain_glyph)==S_hodoor))printf(",\"door\":\"open\"");
        /* A doorway whose door was smashed (kicked, force bolt, dug, a monster), not one that never
           had a door, so the client can keep the jamb and scatter splinters. Same test as farlook. */
        else if(glyph_is_cmap(terrain_glyph)&&glyph_to_cmap(terrain_glyph)==S_ndoor&&IS_DOOR(levl[x][y].typ)&&
                (levl[x][y].doormask&~D_TRAPPED)==D_BROKEN&&is_drawbridge_wall(x,y)<0)printf(",\"door\":\"broken\"");
        printf(",\"invisible\":%s",glyph_is_invisible(g)?"true":"false");
        printf(",\"kind\":");quoted(glyph_is_pet(g)?"pet":glyph_is_monster(g)?"monster":glyph_is_object(g)?"object":"terrain");
        /* A trap by the name the hero sees for it (a vibrating square isn't a teleport trap). */
        if (glyph_is_trap(g)) {
            int tt=glyph_to_trap(g);
            printf(",\"trap\":");quoted(defsyms[trap_to_defsym(tt)].explanation);
            if (tt==MAGIC_PORTAL && !Hallucination) {
                struct trap *t=t_at(x,y);
                if (t && t->ttyp==MAGIC_PORTAL && t->tseen) {printf(",\"portal\":");quoted(portal_style(t));}
            }
        }
        /* An engraving the hero has read (or written): its kind, and whether it said Elbereth
           when they last read it, not what it says now. */
        {
            struct engr *ep=engr_at(x,y);
            if (ep && ep->eread && ep->engr_type!=HEADSTONE && ep->engr_time<=moves) {
                printf(",\"engraving\":{\"type\":");quoted(engraving_kind(ep->engr_type));
                printf(",\"elbereth\":%s}",ep->eward?"true":"false");
            }
        }
        if (glyph_is_monster(g) && !glyph_is_pet(g)) {
            struct monst *mtmp = m_at(x,y);
            printf(",\"peaceful\":%s",(mtmp && mtmp->mpeaceful && canspotmon(mtmp))?"true":"false");
        }
        printf(",\"name\":");m=glyph_to_mon(g);quoted(glyph_is_monster(g)&&m>=0?mons[m].mname:glyph_is_object(g)?object_name(g):"");
        if (glyph_is_object(g)) {
            object_type = glyph_is_body(g) ? CORPSE : glyph_to_obj(g);
            printf(",\"object\":{\"kind\":");quoted(object_kind(g));
            printf(",\"otyp\":%d,\"class\":%d,\"material\":%d,\"name\":",object_type,
                   object_type == CORPSE ? FOOD_CLASS : objects[object_type].oc_class,
                   object_type == CORPSE ? FLESH : objects[object_type].oc_material);
            quoted(object_name(g));
            printf(",\"label\":");quoted(seen_name(g,x,y));
            if (seen_identified(g,x,y)) printf(",\"identified\":true");
            /* the top weapon's known enchantment and blessing, only while the hero sees it */
            if (cansee(x,y) && !Hallucination && !glyph_is_body(g)) {
                struct obj *top=vobj_at(x,y);
                if (top && top->otyp==object_type && top->dknown) known_magic(top);
            }
            /* A lit lamp, lantern or candle the hero can see, so the client can light its flame. */
            {
                struct obj *top=vobj_at(x,y);
                if (cansee(x,y) && top && top->otyp==object_type && top->lamplit) printf(",\"lit\":true");
            }
            if (object_type != CORPSE && OBJ_DESCR(objects[object_type])) {
                printf(",\"appearance\":");quoted(OBJ_DESCR(objects[object_type]));
            }
            /* A statue's monster, with its class letter and colour so the client builds the same
               model the live monster gets. */
            if (glyph_is_statue(g)) {
                m = glyph_to_mon(g);
                printf(",\"creature\":");quoted(mons[m].mname);
                printf(",\"creatureSymbol\":%d,\"creatureColor\":%d",def_monsyms[(int)mons[m].mlet],mons[m].mcolor);
            } else if (object_type == STATUE && cansee(x,y) && !Hallucination) {
                struct obj *statue = sobj_at(STATUE,x,y);
                if (statue && statue->corpsenm >= 0 && statue->corpsenm < NUMMONS) {
                    printf(",\"creature\":");quoted(mons[statue->corpsenm].mname);
                    printf(",\"creatureSymbol\":%d,\"creatureColor\":%d",def_monsyms[(int)mons[statue->corpsenm].mlet],mons[statue->corpsenm].mcolor);
                }
            }
            /* A corpse's monster class letter and colour, so the client lays out the same model the
               live monster had (UnNetHack's dragons and many @ only tell apart by letter). */
            if (glyph_is_body(g)) {
                m = g - GLYPH_BODY_OFF;
                printf(",\"creatureSymbol\":%d,\"creatureColor\":%d",def_monsyms[(int)mons[m].mlet],mons[m].mcolor);
            }
            putchar('}');
        }
        putchar('}');
    }
    puts("]}");fflush(stdout);
}
/* Ctrl+C or a closed terminal signals the engine while it sits in fgets() holding stdin's lock.
   NetHack's own handlers (done1, hangup) then prompt and save from inside the handler, and the
   save's compressor fork deadlocks on that lock: the engine hangs for good, holding the game's
   lock files, and the next start finds "a game in progress". Instead, only note the signal here
   (no SA_RESTART, so fgets() returns) and save from read_request(). Re-armed before every read,
   since NetHack puts done1 back on SIGINT after each save or restore. */
static volatile sig_atomic_t signalled;
static void note_signal(int sig UNUSED){signalled=1;}
static void catch_signals(void){struct sigaction sa;memset(&sa,0,sizeof sa);sa.sa_handler=note_signal;sigemptyset(&sa.sa_mask);
    sigaction(SIGINT,&sa,0);sigaction(SIGHUP,&sa,0);sigaction(SIGTERM,&sa,0);}
/* Input is one decimal keycode or a UTF-8 line, only after a request. */
static void read_request(const char *kind,const char *prompt,char *buf,int size) {
    /* Before a level exists (getlock's "Destroy old game?" comes before the dungeon is set up)
       there is no map to describe, so send the prompt alone. */
    fx_flush();if(u.uz.dlevel)frame();printf("{\"type\":\"request\",\"id\":%ld,\"kind\":",++request_id);quoted(kind);printf(",\"prompt\":");quoted(prompt);puts("}");fflush(stdout);
    catch_signals();
    if(signalled||!fgets(buf,size,stdin)) { hangup(0);exit(0); }
    buf[strcspn(buf,"\r\n")]=0;
}
static int key(const char *kind,const char *prompt) {char buf[BUFSZ];read_request(kind,prompt,buf,sizeof buf);int k=atoi(buf);return k>0&&k<256?k:27;}
static void noop(void) {}
static void strnoop(const char *s UNUSED) {}
static void intnoop(int i UNUSED) {}
/* SIGPIPE is ignored so an engine whose server has gone can still finish saving. */
static void init(int *a UNUSED,char **v UNUSED) {setvbuf(stdout,NULL,_IOLBF,0);signal(SIGPIPE,SIG_IGN);for(int x=0;x<COLNO;x++)for(int y=0;y<ROWNO;y++)glyphs[x][y]=backgrounds[x][y]=-1;iflags.window_inited=TRUE;iflags.use_background_glyph=TRUE;
#if defined(TTY_GRAPHICS) && defined(TEXTCOLOR)
    for(int i=0;i<CLR_MAX;i++)if(!hilites[i])hilites[i]=no_escape;
#endif
    tmp_at_hook=fx_hook;combat_hook=combat_hook_bridge;death_hook=death_hook_bridge;revive_hook=revive_hook_bridge;}
static void name(void){Strcpy(plname,"Wanderer");}
static void finish(const char *s){tmp_at_hook=0;combat_hook=0;death_hook=0;revive_hook=0;fxdepth=0;fx_flush();event("ended",s);iflags.window_inited=FALSE;}
static winid create(int type){for(int i=1;i<BW;i++)if(!wins[i].type){wins[i].type=type;return i;}panic("bridge windows exhausted");return WIN_ERR;}
static void clear(winid w){if(w<1||w>=BW)return;for(int i=0;i<wins[w].n;i++)free(wins[w].items[i].text);wins[w].n=0;wins[w].prompt[0]=0;if(wins[w].type==NHW_MAP)for(int x=0;x<COLNO;x++)for(int y=0;y<ROWNO;y++)glyphs[x][y]=backgrounds[x][y]=-1;}
static void destroy(winid w){clear(w);if(w>0&&w<BW)wins[w].type=0;}
static void bridge_curs(winid w UNUSED,int x UNUSED,int y UNUSED){}
static void put(winid w,int attr UNUSED,const char *s){if(w>0&&w<BW&&(wins[w].type==NHW_TEXT||wins[w].type==NHW_MENU)){if(wins[w].n<BM){struct entry *e=&wins[w].items[wins[w].n++];e->text=strdup(s);e->selectable=FALSE;}}else event(w>0&&w<BW&&wins[w].type==NHW_STATUS?"status":"message",s);}
static void raw(const char *s){event("message",s);}
static void display(winid w,boolean block){if(w>0&&w<BW&&wins[w].n){printf("{\"type\":\"text\",\"lines\":[");for(int i=0;i<wins[w].n;i++){if(i)putchar(',');quoted(wins[w].items[i].text);}puts("]}");}if(block)key("more","Continue");}
static void file(
#ifdef FILE_AREAS
 const char *area,
#endif
 const char *path,boolean complain){
#ifdef FILE_AREAS
 dlb *f=dlb_fopen_area(area,path,"r");
#else
 dlb *f=dlb_fopen(path,"r");
#endif
 if(!f){if(complain)event("message","Could not open game text.");return;}winid w=create(NHW_TEXT);char s[BUFSZ];while(dlb_fgets(s,sizeof s,f))put(w,0,s);dlb_fclose(f);display(w,TRUE);destroy(w);}
static void add(winid w,int glyph UNUSED,int cnt UNUSED,const ANY_P *id,char accel,char group,int attr UNUSED,const char *s,unsigned int selected UNUSED){if(w<1||w>=BW||wins[w].n>=BM)return;struct entry *e=&wins[w].items[wins[w].n++];e->id=*id;e->selectable=id->a_void!=0;e->accelerator=accel;e->group_accelerator=group;e->text=strdup(s);}
static void end(winid w,const char *s){if(w>0&&w<BW)snprintf(wins[w].prompt,BUFSZ,"%s",s?s:"");}
static int bridge_select(winid w,int how,menu_item **out){char buf[BUFSZ];*out=NULL;if(w<1||w>=BW)return -1;
 printf("{\"type\":\"menu\",\"how\":%d,\"items\":[",how);for(int i=0;i<wins[w].n;i++){if(i)putchar(',');printf("{\"id\":%d,\"selectable\":%s,\"accelerator\":",i,wins[w].items[i].selectable?"true":"false");if(wins[w].items[i].accelerator) { char accel[2]={wins[w].items[i].accelerator,0};quoted(accel); } else quoted("");if(wins[w].items[i].group_accelerator){char group[2]={wins[w].items[i].group_accelerator,0};printf(",\"group\":");quoted(group);}printf(",\"text\":");quoted(wins[w].items[i].text);putchar('}');}puts("]}");
 read_request("menu",wins[w].prompt,buf,sizeof buf);if(buf[0]=='!' )return -1;if(how==PICK_NONE)return 0;
 menu_item picked[BM];boolean seen[BM]={0};int n=0;char *p=strtok(buf,",");while(p){char *tail;long i=strtol(p,&tail,10);if(*tail==0&&i>=0&&i<wins[w].n&&wins[w].items[i].selectable&&!seen[i]){seen[i]=TRUE;picked[n].item=wins[w].items[i].id;picked[n++].count=-1;if(how==PICK_ONE)break;}p=strtok(NULL,",");}
 if(n){*out=(menu_item*)alloc(n*sizeof(menu_item));memcpy(*out,picked,n*sizeof(menu_item));}return n;}
static void glyph(winid w UNUSED,coordxy x,coordxy y,int g,int b){if(x>0&&x<COLNO&&y>=0&&y<ROWNO){glyphs[x][y]=g;if(cansee(x,y))backgrounds[x][y]=(b==NO_GLYPH?cmap_to_glyph(S_room):b);}}
static int getkey(void){return key("key","Command or direction");}
/* getpos() (travel, stair travel, farlook, targeting) reads keys through nh_poskey too;
   report those as a position prompt so the UI stops treating them as a normal turn. */
static int poskey(coordxy *x UNUSED,coordxy *y UNUSED,int *m UNUSED){
 if(in_getpos)return key("position",iflags.getloc_travelmode?"Pick a spot: < > stairs, . or , to travel, Esc to cancel":"Pick a spot: move with h/j/k/l, < > stairs, . or , to choose, Esc to cancel");
 return key("command","Your move");}
static char bridge_yn(const char *q,const char *choices,char def){char prompt[BUFSZ];snprintf(prompt,sizeof prompt,"%s [%s] (default: %c)",q,choices?choices:"any key",def?def:' ');for(;;){int k=key("key",prompt);if((k==13||k==10||k==' ')&&def)return def;if(k==27)return choices&&strchr(choices,'q')?'q':choices&&strchr(choices,'n')?'n':def?def:27;if(!choices||strchr(choices,k))return k;}}
static void line(const char *q,char *buf){read_request("line",q,buf,BUFSZ);}
/* Extended commands: the client gets the list (for autocomplete) before the prompt, and a
   typed name may be cut short as long as only one command starts with it. */
static boolean ext_ok(int i){const struct ext_func_tab *c=&extcmdlist[i];return strcmp(c->ef_txt,"#")&&!(c->flags&CMD_NOT_AVAILABLE)&&(!(c->flags&WIZMODECMD)||wizard);}
static int ext(void){char buf[BUFSZ];
 printf("{\"type\":\"commands\",\"items\":[");boolean first=TRUE;
 for(int i=0;extcmdlist[i].ef_txt;i++){if(!ext_ok(i))continue;if(!first)putchar(',');first=FALSE;printf("{\"name\":");quoted(extcmdlist[i].ef_txt);printf(",\"desc\":");quoted(extcmdlist[i].ef_desc);printf(",\"auto\":%s}",extcmdlist[i].flags&AUTOCOMPLETE?"true":"false");}
 puts("]}");
 line("Extended command",buf);
 char *p=buf;while(*p==' '||*p=='#')p++;int n=(int)strlen(p);while(n&&p[n-1]==' ')p[--n]=0;for(int i=0;i<n;i++)p[i]=lowc(p[i]);if(!n)return -1;
 int hit=-1;for(int i=0;extcmdlist[i].ef_txt;i++){if(!ext_ok(i))continue;if(!strcmp(p,extcmdlist[i].ef_txt))return i;if(!strncmp(p,extcmdlist[i].ef_txt,n))hit=hit==-1?i:-2;}
 return hit>=0?hit:-1;}
static void clip(int x UNUSED,int y UNUSED){}
static int prev(void){return 0;}
static void rip(winid w UNUSED,int how UNUSED){}
struct window_procs bridge_procs={
 .name="bridge",.wincap=WC_COLOR,.win_init_nhwindows=init,.win_player_selection=noop,.win_askname=name,.win_get_nh_event=noop,.win_exit_nhwindows=finish,.win_suspend_nhwindows=strnoop,.win_resume_nhwindows=noop,
 .win_create_nhwindow=create,.win_clear_nhwindow=clear,.win_display_nhwindow=display,.win_destroy_nhwindow=destroy,.win_curs=bridge_curs,.win_putstr=put,.win_display_file=file,.win_start_menu=clear,.win_add_menu=add,.win_end_menu=end,.win_select_menu=bridge_select,.win_message_menu=genl_message_menu,.win_update_inventory=noop,.win_mark_synch=noop,.win_wait_synch=noop,
#ifdef CLIPPING
 .win_cliparound=clip,
#endif
 .win_print_glyph=glyph,.win_raw_print=raw,.win_raw_print_bold=raw,.win_nhgetch=getkey,.win_nh_poskey=poskey,.win_nhbell=noop,.win_doprev_message=prev,.win_yn_function=bridge_yn,.win_getlin=line,.win_get_ext_cmd=ext,.win_number_pad=intnoop,.win_delay_output=fx_delay,.win_start_screen=noop,.win_end_screen=noop,.win_outrip=rip,.win_preference_update=strnoop
};
