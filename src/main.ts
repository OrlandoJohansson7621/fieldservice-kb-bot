import { answerWorkOrder, WorkOrder } from "./fieldservice_bot.js";

const sample = WorkOrder.parse({ workOrderId: "WO-1042", photoNotes: "Pump housing shows a hairline crack near the lower bolt.", dispatchStatus: "on_site", technicianFollowUp: "Confirm isolation steps and the approved replacement procedure." });
const result = await answerWorkOrder(sample);
console.log(JSON.stringify({ workOrderId: sample.workOrderId, ...result }, null, 2));
