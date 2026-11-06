# Memorial Website — Readable Source Edition

This version contains the same website layout and Supabase integration as the professional edition, but the HTML, CSS, and JavaScript have been **reformatted for easier editing**. The code is not compressed/minified.

## Which file should I edit?

| File | What it controls |
| --- | --- |
| `index.html` | Public memorial page: name, photo, story, biography, programme, announcements |
| `family.html` | Private family planning dashboard layout and labels |
| `styles.css` | Fonts, colours, spacing, backgrounds, responsive design |
| `public.js` | Public navigation and other page behaviour |
| `family.js` | Supabase login, task tracking, progress and budgets |
| `config.js` | Supabase project URL and **publishable** key (never put a service-role key here) |
| `schema.sql` | Database tables and Supabase security policies |

## Easy steps to personalize

1. Open `index.html` in VS Code. Use **Ctrl+F** to find `Memorial Hero`, `Story Section`, `Journey Section`, `Programme Section`, `Memory Gallery Section`, or `Announcements Section`.
2. Edit only the text between HTML tags, e.g. `<h1>Full Name</h1>`. Avoid deleting closing tags such as `</section>`.
3. Put approved public photos in an `images/` folder and set image URLs to `images/your-photo.jpg`. Keep private documents out of this public GitHub repository.
4. Open `styles.css` and edit the variables near the top in `:root` for consistent site-wide colours.
5. Preview locally in VS Code with a local server. GitHub Pages will serve `index.html` automatically when published.
6. To activate the family portal, configure `config.js` and apply `schema.sql` in Supabase. Test approved and unapproved accounts before using real family information.

> **Security:** The public files are visible to website visitors. The portal uses Supabase authentication and Row Level Security; hiding a link or `noindex` does not secure the family data. Never place bank details, private records, or credentials directly in HTML or JavaScript.

## VS Code editing tips

- **Ctrl+Shift+F** searches all website files.
- **Ctrl+K, Ctrl+0** collapses all sections; **Ctrl+K, Ctrl+J** expands them.
- **Shift+Alt+F** formats a document using your configured formatter.
- Enable **View → Word Wrap** if you prefer long text to wrap in the editor.

---

# Memorial & Family Burial Planning Website

## What is included
- `index.html` — public, responsive memorial site with obituary, life story, arrangements, and updates. Memorial text is customizable; unconfirmed programme details are clearly labelled.
- `family.html` — family login, preparation tracker, progress metrics, filters, expense summary, task creation/editing.
- `family.js` — Supabase authentication and live database operations.
- `schema.sql` — membership and task tables with access-control policies.
- `config.js` — client-side Supabase URL and publishable key only.
- `styles.css` — design styles.

## Setup
1. Create a Supabase project. In **SQL Editor**, execute `schema.sql`. This is designed for a new project; review before rerunning or incorporating into an existing schema.
2. In Supabase **Authentication > Providers**, enable Email authentication. **Disable public user sign-ups**. Create/invite approved family accounts using Supabase's administrative interface. Set each user's password using the supported invite/recovery flow. Users cannot approve their own accounts.
3. In **Authentication > Users**, copy the UUID of each family member. In SQL Editor, execute an approval SQL statement like `insert into public.family_members (user_id, role) values ('UUID_HERE', 'admin');` for the first administrator. Repeat with `editor` or `viewer` for other approved members. The admin role means full task editing in this starter; account approval remains a trusted Supabase administrator action.
4. Copy the Supabase Project URL and **publishable** key into `config.js`. Do not use a secret or service_role key. Test sign-in, editor create/update, and viewer read-only behavior. Test that a signed-in unapproved user cannot read tasks.
5. Replace *all* sample obituary text, names, dates and venue information in `index.html` and review the supplied, family-approved photographs.
6. Upload `index.html`, `family.html`, `styles.css`, `family.js`, `config.js` to your GitHub repository. Publish using **Settings > Pages > Deploy from a branch** with root folder. A project site will work at `https://USERNAME.github.io/REPO/` because links are relative.
7. Visit the live `/family.html` site over HTTPS and confirm permissions. Never upload confidential planning data into the repository.

## Security model and limitations
- GitHub Pages publishes all website source. The private **data** is protected by Supabase Auth and PostgreSQL RLS. The family login *page* itself is public, which is normal for login pages.
- Supabase publishable keys may be in client-side code **only** with securely configured RLS. Never expose `service_role` or secret keys.
- This starter has email/password authentication; configure MFA for family accounts and stricter authentication safeguards in Supabase as appropriate before live use.
- Authentication restricts data access; it does **not** grant the browser the ability to administer family memberships. Grant/revoke memberships via trusted administrator in Supabase SQL Editor. For a full user management feature, add a secured backend later.
- All approved members can view all tasks, including finances. For finer-grained finance visibility, introduce separate protected tables/policies before entering sensitive data.
- Budget totals are numeric without a currency symbol; choose a single currency, or extend the data model with explicit currency and conversion support.
- There is no task delete, audit history, backup automation, or invitation interface in this version. Protect the database with project backups and agreed retention/access procedures.
- A noindex meta tag on the family login page reduces indexing but is **not** an access-control mechanism.
- Respect consent and privacy for public photos, addresses, and obituary details.

## Edition 2: professional memorial and dashboard upgrade
- **Public site:** Responsive memorial homepage with portraits, obituary, legacy cards, funeral programme, interactive gallery and announcements.
- **Private portal:** Redesigned login and dashboard; task search, category progress summaries, overdue/next-seven-days highlights, budget variance, manual refresh, and CSV export. Existing Supabase Auth/RLS controls remain in place.
- **Deployment:** Include the NEW `public.js` file alongside the other files when publishing GitHub Pages. Keep `config.js` to client-safe publishable credentials only.
- **Privacy:** Exported CSVs contain private task, contact, note and budget data. Family users should store them securely; exporting does not make the information public on GitHub Pages.
- **Access and limitations:** Database membership approval is still performed by a trusted Supabase project administrator. This version has no public tribute submission, no file upload, no in-app account approvals, no delete or audit trail. Do not present the sample content as confirmed arrangements.
- **Validation:** JavaScript syntax checked locally, but the live sign-in and database behaviors require testing against your configured Supabase project.


## Responsive layout (mobile and tablet)

Responsive CSS is grouped at the **end of `styles.css`** under `RESPONSIVE REFINEMENTS`.
- Desktop: 1025px and wider; full navigation and multi-column layouts.
- Tablet: 769–1024px; tighter spacing and adjusted multi-column layouts.
- Mobile/narrow tablet: up to 768px; collapsible navigation, single-column memorial sections and a two-column family scorecard.
- Small phones: up to 420px; additional spacing reductions, stacked photo gallery and compact forms.
- Family task table scrolls horizontally on phones, with an onscreen hint. No task data or columns are removed.
- Inputs are 16px on mobile to avoid automatic iOS zoom; buttons use at least 44px touch targets.

Test at 320px, 375px, 390px, 768px, 820px, 1024px and desktop width using your browser's responsive preview.


## Memorial content in this version

- Homepage photograph: `images/pic8.png`.
- Gallery: `images/pic7.png`, `images/pic6.png`, `images/pic5(1).png`, `images/pic4.png`, `images/pic3.png`.
- Display name: **Beloved Veronica Uzoamaka Chiaha**.
- Transition to Glory: **November 2nd, 2026**.
- Birth date is not supplied. The label is displayed without an invented date; add a date in `index.html` once confirmed.
- All image paths are relative to the HTML file in the `images/` subdirectory.
- Memorial appearance overrides are at the end of `styles.css` in the **MEMORIAL PERSONALIZATION** section.
- Funeral dates and venues are not specified, so no unverified date or venue has been added.


## Photo gallery: add, delete, replace, rearrange

All photographs live in `images/`. The **only photo list to edit** is at the beginning of `gallery.js` (`PHOTOS`).

- **Add a photo:** copy `new-picture.jpg` into `images/`, then add `{ file: 'new-picture.jpg', description: 'A description of the photograph' },` to `PHOTOS`.
- **Remove a photo:** delete its entry from the list. You can also delete the photo file if it is unused.
- **Replace a photo:** change the file name in that entry; update its `description`. If a `thumbnail` is listed and not valid for your new image, remove `thumbnail`.
- **Reorder photos:** move the entries up/down in the list.
- **Thumbnail files:** `images/thumbnails/*.webp` were generated for the existing photos. They make the gallery faster without sacrificing quality in the full-screen view. New photos work without thumbnails.

When a visitor selects a photo, a lightbox opens the **original** image without cropping. Escape closes it; left/right arrow keys and on-screen arrows switch photos. On phones, the gallery becomes one column. The public website does not require a database for gallery editing, but changes must be committed and deployed to GitHub Pages.

The main portrait remains `images/pic8.png`. The birth date has not been provided; no date is invented. The funeral schedule still correctly says details are to be announced until confirmed.
