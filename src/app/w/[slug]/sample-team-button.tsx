import { ActionForm } from "@/components/action-form";
import { getMessages } from "@/lib/i18n/server";
import { addSampleTeamAction, removeSampleTeamAction } from "./sample-team-actions";

/** "Fill with a sample team", or "Remove sample team" once there is one. For admins. */
export async function SampleTeamButton({ slug, samples }: { slug: string; samples: number }) {
  const t = (await getMessages()).members.sample;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
      {samples > 0 ? (
        <>
          <ActionForm action={removeSampleTeamAction.bind(null, slug)} confirm={t.removeConfirm}>
            <button className="btn-secondary px-3 py-1">{t.remove}</button>
          </ActionForm>
          <p className="min-w-0 flex-1 text-xs text-muted">
            {t.present(samples)} {t.removeHint}
          </p>
        </>
      ) : (
        <>
          <ActionForm action={addSampleTeamAction.bind(null, slug)}>
            <button className="btn-secondary px-3 py-1">{t.fill}</button>
          </ActionForm>
          <p className="min-w-0 flex-1 text-xs text-muted">{t.fillHint}</p>
        </>
      )}
    </div>
  );
}
