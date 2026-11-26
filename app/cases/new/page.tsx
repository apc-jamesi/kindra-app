import CaseWizard from "@/components/CaseWizard";
import { config } from "@/lib/config";
import { nowManila } from "@/lib/format";
import { SAMPLE_INPUTS } from "@/lib/samples";
import { currentUser, myStudents } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ student?: string; case?: string }> }) {
  const { student, case: caseId } = await searchParams;
  const user = await currentUser();
  const students = await myStudents(user);
  const preselected = students.some((s) => s.id === student) ? student! : "";

  // Completing a pending conference (logged but not yet documented).
  let pending = null;
  if (caseId && preselected) {
    const c = await getStore().getCase(caseId);
    if (c && c.studentId === preselected && !c.documentedAt) {
      pending = { id: c.id, caseType: c.caseType, conferenceAt: c.conferenceAt };
    }
  }

  const now = nowManila();
  return (
    <CaseWizard
      students={students.map(({ id, name, section }) => ({ id, name, section }))}
      preselectedStudentId={preselected}
      pending={pending}
      samples={SAMPLE_INPUTS.map(({ id, title, format, paragraphs }) => ({ id, title, format, text: paragraphs.join("\n") }))}
      aiMode={config.aiMode}
      userName={user.name}
      today={now.date}
      nowTime={now.time}
    />
  );
}
