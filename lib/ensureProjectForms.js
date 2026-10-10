import InstallationProject from "@/models/installationProjects";
import ProjectAssessment from "@/models/projectAssessments";
import ProjectHandover from "@/models/projectHandovers";

/**
 * Repairs historical assignments as well as new ones: every active/passive
 * assignment must always have exactly one assessment and one handover record.
 */
export async function ensureProjectFormsForUser(userId) {
  const projects = await InstallationProject.find({
    $or: [{ passiveAgent: userId }, { activeAgent: userId }],
  }).select("passiveAgent activeAgent").lean();

  const assignments = projects.flatMap((project) => [
    String(project.passiveAgent) === String(userId) ? { project: project._id, assigneeRole: "passive_agent" } : null,
    String(project.activeAgent) === String(userId) ? { project: project._id, assigneeRole: "active_agent" } : null,
  ].filter(Boolean));

  if (!assignments.length) return;

  await Promise.all([
    ProjectAssessment.bulkWrite(assignments.map((assignment) => ({
      updateOne: {
        filter: { ...assignment, assignee: userId },
        update: { $setOnInsert: { ...assignment, assignee: userId } },
        upsert: true,
      },
    }))),
    ProjectHandover.bulkWrite(assignments.map((assignment) => ({
      updateOne: {
        filter: { ...assignment, assignee: userId },
        update: { $setOnInsert: { ...assignment, assignee: userId } },
        upsert: true,
      },
    }))),
  ]);
}
