/** @param {NS} ns */
/**********************************************************************************************************
 * workbench.js - a tool to speed incremental development
 * 
 * Old way: change code and save; `run myScript.js` and observe result; `kill script.js`; repeat
 *   Can skip some typing by clicking the Kill/Run button on a tail window
 * 
 * New way: `run workbench.js myScript.js` and observe the result; change code and save; observe the result
 *   When the script is changed it is automatically restarted
 * 
 * Wins:
 *   ===> Saves a bit of clicking when using in-game editor
 *   ===> Absolutely rocks when using VSCode, hands free upload/kill/run
 * 
 * Assumption: the script to debugged runs forever and clears the log with each loop:
 *   while (true) {
 *      ns.clearLog();
 *      ns.print("master plan for world domination);
 *   }
 *********************************************************************************************************** 
 */
export async function main(ns) {
    if (ns.args.length === 0) {
        ns.tprint("This script starts another script, restarts it when it is updated.");
        ns.tprint(`USAGE: run ${ns.getScriptName()} DEBUG_SCRIPT {script args}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} haxx0r.script n00dles --haxFlags`)
        return;
    }
    const script = ns.args[0];
    const targetArgs = ns.args.slice(1);
    if (!ns.fileExists(script)) {
        ns.tprint("ERROR no script " + script);
        ns.exit();
    }
    const mix = ns.ps("home"); // only home for now is just fine
    mix.forEach(function (mix) {
        if (mix.filename === script) {
            ns.tprint("WARN restarting already running " + script + " PID " + mix.pid);
            ns.kill(mix.pid);
        }
    });

    let PID = ns.run(script, 1, ...targetArgs);
    let scriptSource = ns.read(script);
    let scriptSource_checksum = checksum(scriptSource);
    ns.disableLog("sleep");

    // No ns joy here... the fix is in flight for this!
    // https://github.com/danielyxie/bitburner/pull/2588
    // Instead for now need to kill the script manually when finished
    //
    // ns.atExit(() => { ns.kill(PID); });

    while (true) {
        ns.clearLog();
        ns.tail();

        const runSource = ns.read(script);
        const runSource_checksum = checksum(runSource);
        if (scriptSource_checksum != runSource_checksum) {
            ns.kill(PID);
            await ns.sleep(100); // seems right? code review..................
            PID = ns.run(script, 1, ...targetArgs);
            scriptSource_checksum = runSource_checksum;
        } else {
            const debugLog = ns.getScriptLogs(script, "home", ...targetArgs);
            debugLog.forEach(logLine => ns.print(logLine));
        }
        await ns.sleep(100);
    }

    // https://stackoverflow.com/questions/811195/fast-open-source-checksum-for-small-strings
    function checksum(s) {
        var chk = 0x12345678;
        var len = s.length;
        for (var i = 0; i < len; i++) {
            chk += (s.charCodeAt(i) * (i + 1));
        }

        return (chk & 0xffffffff).toString(16);
    }
}
