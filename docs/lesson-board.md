# Karrini lesson board

In a live class, the teacher selects **Board / السبورة / Tableau** in the call controls. The camera stays visible below the board. Students follow the active page without editing permissions. Switch back to the camera or screen sharing using the call controls.

The toolbar offers selection/moving, pen, highlighter, object eraser, text, lines/arrows/shapes, ink color, width, undo and redo. Clear removes annotations while retaining an imported page. New page keeps previous pages. The page menu navigates the deck. Touch and pen input use the same tools. Limits: 80 pages, 2,000 annotations per page, 20 MB input files, 8 MB saved vector document.

**Save** downloads PDF, PowerPoint (`.pptx`) or Word (`.docx`), or publishes the chosen format to the taught group's class materials, optionally within a chapter. A whole-class session publishes to all enrolled students. The export dialog names the audience explicitly. All exports contain faithful page images with annotations; the original document's text and objects are not rewritten. Editable annotation layers remain in Karrini. Original source files are not modified.

End class saves the board, then offers **Review lesson board**. The same review is available in the class's Results tab. IndexedDB holds a device draft and imported page images; Supabase holds the board and private page images. Reconnecting retries saves and restores the most recent revision. Keep the browser tab open and download a copy if both local and cloud storage fail.

## Required backend setup

Apply [20261017010000_lesson_boards.sql](../supabase/migrations/20261017010000_lesson_boards.sql) to the same Supabase project used by `.env.local`, after the existing migrations. Use a linked Supabase CLI project with `supabase db push`, or paste this migration into that project's SQL editor. The application does not contain a database connection or management token, so this migration is **not applied automatically** by the Next.js app.

The migration adds `lesson_boards`, the private `board-assets` bucket, a teacher-only save RPC, private `board:<session UUID>` broadcast policies, and `materials.group_id` with matching file access policies. Existing materials remain whole-class documents. A board's original audience is immutable, including when a timetable group is deleted. Supabase [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) enforces send/read permissions on the private channel. Do not replace it with the existing class-wide question channel.

PDF and image import and all exports run in the browser. Word/PowerPoint import additionally needs the conversion worker below. Until the migration is applied, cloud save and group publishing cannot work; the board clearly reports a local draft instead of claiming a cloud save.

## Office conversion worker

The app never sends documents to a public conversion website. The authenticated `/api/board/convert` endpoint accepts verified teachers only and forwards files to the worker configured by the operator. The worker uses LibreOffice's documented [headless conversion parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).

1. Install Docker from its official source on the development host, or deploy the worker to your own container host.
2. Set `BOARD_CONVERTER_SECRET` in the shell to a new random secret of at least 32 characters. Keep the same value in the app's server environment.
3. From `tools/board-converter`, run `docker compose up --build -d`.
4. Add these **server-only** settings to `.env.local` and restart Next.js:

   ```dotenv
   BOARD_CONVERTER_URL=http://127.0.0.1:8080
   BOARD_CONVERTER_SECRET=<the same secret>
   ```

For production, point the URL to your own private worker endpoint. Keep its token private and use HTTPS if traffic leaves the host. The sample Compose binds only to localhost and places the worker on an internal network without outbound Internet access. It runs as a non-root user with a read-only filesystem, bounded temporary storage, CPU/memory/process limits and no added capabilities. Macro security is set to its highest level in a fresh per-job LibreOffice profile. Office archives are checked for expected contents, size limits and embedded active content. Legacy `.doc`/`.ppt` signatures are checked; password-protected documents and embedded active content are unsupported. Jobs time out and temporary files are removed. A busy worker returns an error the teacher can retry; scale worker instances behind a private gateway for concurrent classes.

Cloud hosts may impose upload/body/time limits lower than the application's 20 MB / 120 second route limits. Configure the host accordingly, or accept the host's lower file limit. Office-to-PDF rendering may reflow fonts unavailable to LibreOffice; the worker includes Noto and Liberation fonts for Arabic/French.

## Validation

```powershell
npm run check:board
node scripts/check-translations.cjs
npx tsc --noEmit
npm run lint
npm run build
```

`check:board` validates board data/geometry, Office archive rejection and the **actual migration** in isolated PostgreSQL (PGlite). It tests teacher writes, student read-only access, group isolation, file access, teacher-only broadcast, stale revisions and privacy after group deletion. It does not access the configured Supabase database.

`/fr/board-lab` and `/ar/board-lab` are development-only manual test fixtures. They store only local test data, use a local BroadcastChannel between tabs, and do not open a camera, authenticate, email students or upload class files. Open a second tab and switch it to student mode for live synchronization checks. The route returns 404 in production. Live Supabase and LibreOffice integration must also be smoke-tested after deployment/configuration.
