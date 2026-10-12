// Watches the live link to the engine. Events normally flow without a break; when the stream errors
// or a poll fails and nothing comes back within the grace period, the player gets a banner with a
// Reconnect button instead of a silent frozen screen. A server that came back with a different
// session token restarted underneath us (a deploy): the game was saved on the way down, so the
// banner offers Continue. Timers are injectable so the tests need no real waiting.
export function createLinkWatch({graceMs=15000,onLost,onBack,onRestart,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let timer=null,lost=false,token=null,restarted=false;
  return {
    // the stream errored or a poll failed: start the grace period (once)
    lost(){if(timer||lost||restarted)return;timer=setTimer(()=>{timer=null;lost=true;onLost?.();},graceMs);},
    // events are flowing again
    ok(){if(timer){clearTimer(timer);timer=null;}if(lost){lost=false;onBack?.();}},
    // the session token the server reports now; a different one means it restarted
    token(t){if(token===null){token=t;return false;}if(t!==token){this.restart();return true;}return false;},
    restart(){if(restarted)return;restarted=true;if(timer){clearTimer(timer);timer=null;}lost=false;onRestart?.();},
    get isLost(){return lost;},get restarted(){return restarted;},
    stop(){if(timer){clearTimer(timer);timer=null;}},
  };
}
