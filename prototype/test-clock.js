// The clock for the build-time budgets in the tests ("the kitten is grown in under 8 s"): this process's own CPU
// time in milliseconds, not the wall clock. The suite runs one test file per core, and on a busy CI runner a
// file waits for a core; wall-clock budgets then failed with no change to the code. CPU time counts only the work
// done (worker threads included), so a budget still catches a build that got slower, and only that.
export const cpuNow = () => { const c = process.cpuUsage(); return (c.user + c.system) / 1000; };
