const { spawn } = require("child_process");
const path = require("path");

const suites = [
  { name: "Unit: Validation Utilities", file: "server/test/unit/validation.test.js", category: "UNIT" },
  { name: "Unit: Rate Limit & Proxy Trust", file: "server/test/unit/rateLimit.test.js", category: "UNIT" },
  { name: "Unit: Controller Logic & Safety", file: "server/test/unit/controllers.test.js", category: "UNIT" },
  { name: "Unit: ID Generation & Compatibility", file: "server/test/unit/id.test.js", category: "UNIT" },
  { name: "Integration: Express HTTP & Health", file: "server/test/integration/express_http.test.js", category: "INTEGRATION" },
  { name: "Integration: Prototype End-to-End Runtime", file: "server/test/integration/prototype_e2e.test.js", category: "INTEGRATION" },
  { name: "Integration: Live MongoDB", file: "server/test/integration/mongodb.integration.test.js", category: "BLOCKED_DB" },
  { name: "Integration: MongoDB Replica Transactions", file: "server/test/integration/mongodb_transactions.integration.test.js", category: "BLOCKED_DB" },
  { name: "Integration: Razorpay API Sandbox", file: "server/test/integration/razorpay.integration.test.js", category: "BLOCKED_PAYMENT" }
];

const workspaceRoot = path.resolve(__dirname, "../..");

async function runSuite(suite) {
  return new Promise((resolve) => {
    const fullPath = path.resolve(workspaceRoot, suite.file);
    const proc = spawn(process.execPath, [fullPath], {
      cwd: workspaceRoot,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      // Parse node:test output
      const passMatch = stdout.match(/ℹ pass (\d+)/);
      const failMatch = stdout.match(/ℹ fail (\d+)/);
      const skipMatch = stdout.match(/ℹ skipped (\d+)/);
      const testMatch = stdout.match(/ℹ tests (\d+)/);

      const pass = passMatch ? parseInt(passMatch[1], 10) : 0;
      const fail = failMatch ? parseInt(failMatch[1], 10) : (code !== 0 ? 1 : 0);
      const skip = skipMatch ? parseInt(skipMatch[1], 10) : 0;
      const total = testMatch ? parseInt(testMatch[1], 10) : (pass + fail + skip);

      resolve({
        suite,
        code,
        total,
        pass,
        fail,
        skip,
        stdout,
        stderr
      });
    });
  });
}

async function main() {
  console.log("================================================================================");
  console.log("   FARMFRESH HUBS — PHASE 3 AUTOMATED REGRESSION & TEST COVERAGE REPORT         ");
  console.log("================================================================================\n");

  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;

  const results = [];

  for (const s of suites) {
    const res = await runSuite(s);
    results.push(res);
    totalTests += res.total;
    totalPass += res.pass;
    totalFail += res.fail;
    totalSkip += res.skip;
  }

  // Print results summary table
  console.log("--------------------------------------------------------------------------------");
  console.log(" SUITE NAME                                  STATUS      TOTAL  PASS  FAIL  SKIP");
  console.log("--------------------------------------------------------------------------------");

  for (const r of results) {
    const namePadded = r.suite.name.padEnd(42);
    let status = "PASS ";
    if (r.fail > 0) status = "FAIL ";
    else if (r.skip > 0 && r.pass === 0) status = "SKIP ";

    const tot = String(r.total).padStart(5);
    const p = String(r.pass).padStart(5);
    const f = String(r.fail).padStart(5);
    const s = String(r.skip).padStart(5);

    console.log(` ${namePadded} [${status}]  ${tot} ${p} ${f} ${s}`);
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(` TOTALS                                                  ${String(totalTests).padStart(5)} ${String(totalPass).padStart(5)} ${String(totalFail).padStart(5)} ${String(totalSkip).padStart(5)}`);
  console.log("--------------------------------------------------------------------------------\n");

  console.log("--- TEST CATEGORY BREAKDOWN ---");
  const unitTotal = results.filter(r => r.suite.category === "UNIT").reduce((s, r) => s + r.total, 0);
  const unitPass = results.filter(r => r.suite.category === "UNIT").reduce((s, r) => s + r.pass, 0);
  const unitFail = results.filter(r => r.suite.category === "UNIT").reduce((s, r) => s + r.fail, 0);

  const httpTotal = results.filter(r => r.suite.category === "INTEGRATION").reduce((s, r) => s + r.total, 0);
  const httpPass = results.filter(r => r.suite.category === "INTEGRATION").reduce((s, r) => s + r.pass, 0);
  const httpFail = results.filter(r => r.suite.category === "INTEGRATION").reduce((s, r) => s + r.fail, 0);

  const dbSkip = results.filter(r => r.suite.category === "BLOCKED_DB").reduce((s, r) => s + r.skip, 0);
  const paySkip = results.filter(r => r.suite.category === "BLOCKED_PAYMENT").reduce((s, r) => s + r.skip, 0);

  console.log(`1. MOCK UNIT TESTS:           ${String(unitTotal).padStart(2)} executed, ${String(unitPass).padStart(2)} PASSED, ${unitFail} FAILED`);
  console.log(`2. EXPRESS HTTP INTEGRATION:   ${String(httpTotal).padStart(2)} executed, ${String(httpPass).padStart(2)} PASSED, ${httpFail} FAILED`);
  console.log(`3. LIVE DB INTEGRATION:        ${dbSkip} skipped (MONGO_URI not configured / standalone)`);
  console.log(`4. LIVE RAZORPAY SANDBOX:      ${paySkip} skipped (RAZORPAY_KEY_ID/SECRET not configured)\n`);

  if (totalFail > 0) {
    console.error(`❌ REGRESSION SUITE FAILED WITH ${totalFail} ERRORS.\n`);
    for (const r of results) {
      if (r.fail > 0 || r.code !== 0) {
        console.error(`=== FAILURE LOGS: ${r.suite.name} ===`);
        if (r.stderr) console.error(r.stderr);
        if (r.stdout) console.error(r.stdout);
      }
    }
    process.exit(1);
  } else {
    console.log("✅ ALL AVAILABLE TESTS PASSED SUCCESSFULLY! ZERO REGRESSIONS DETECTED.");
  }
}

main().catch((err) => {
  console.error("Runner error:", err);
  process.exit(1);
});
