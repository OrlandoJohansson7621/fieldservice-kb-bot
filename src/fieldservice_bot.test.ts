import { WorkOrder } from "./fieldservice_bot.js";

const valid = { workOrderId: "WO-1", photoNotes: "Seal is split", dispatchStatus: "on_site", technicianFollowUp: "Check lockout procedure" };
if (WorkOrder.parse(valid).dispatchStatus !== "on_site") throw new Error("valid work order was rejected");
const rejected = WorkOrder.safeParse({ ...valid, dispatchStatus: "unknown" });
if (rejected.success) throw new Error("invalid dispatch status was accepted");
console.log("work-order boundary test passed");
