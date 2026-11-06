import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
// Read the invitation/recovery type before supabase-js processes the URL hash.
// The tokens themselves are managed by Supabase; never store them in app code.
const linkHash = new URLSearchParams(window.location.hash.slice(1));
const linkQuery = new URLSearchParams(window.location.search);
const initialLinkType = linkHash.get('type') || linkQuery.get('type');
const linkError = linkHash.get('error_description') || linkQuery.get('error_description');
const $ = id => document.getElementById(id);
const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_');
const db = configured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
let memberRole = 'viewer', tasks = [];
const writeAllowed = () => memberRole === 'admin' || memberRole === 'editor';
const deleteAllowed = () => memberRole === 'admin';
const money = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(n) || 0);
const escapeHTML = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const statusClass = s => s === 'Completed' ? 'completed' : s === 'In progress' ? 'in-progress' : s === 'Blocked' ? 'blocked' : '';
// ------------------------------------------------------------
// Authentication: sign in, invitation, and password recovery
// ------------------------------------------------------------
let passwordSetupRequired = false;

function showLogin(message = '') {
    $('dashboard').hidden = true;
    $('passwordSetup').hidden = true;
    $('login').hidden = false;
    $('loginMessage').textContent = message;
}

function showPasswordSetup(mode = 'invite') {
    passwordSetupRequired = true;
    $('login').hidden = true;
    $('dashboard').hidden = true;
    $('passwordSetup').hidden = false;
    $('passwordSetupForm').reset();
    $('passwordMessage').textContent = '';
    const recovery = mode === 'recovery';
    $('passwordHeading').textContent = recovery ? 'Set a new password' : 'Create your password';
    $('passwordDescription').textContent = recovery
        ? 'Choose a new password for your existing family account.'
        : 'Your family invitation has been accepted. Create a password to access the private planning dashboard.';
    $('newPassword').focus();
}

async function initialize() {
    if (!configured) {
        showLogin('Setup required: enter your Supabase URL and publishable key in config.js.');
        $('loginForm').querySelector('button').disabled = true;
        return;
    }

    // Supabase emits PASSWORD_RECOVERY when a recovery link is accepted.
    // This callback is intentionally synchronous to avoid auth-client deadlocks.
    db.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showPasswordSetup('recovery');
        } else if (event === 'SIGNED_OUT') {
            passwordSetupRequired = false;
            memberRole = 'viewer';
            tasks = [];
            showLogin();
        }
    });

    try {
        // Support token_hash links if the email template uses that format.
        // The default Supabase invite typically uses a #access_token fragment.
        if (linkQuery.get('token_hash') && ['invite', 'recovery'].includes(initialLinkType)) {
            const { error } = await db.auth.verifyOtp({
                token_hash: linkQuery.get('token_hash'),
                type: initialLinkType,
            });
            if (error) throw error;
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const { data: { session }, error } = await db.auth.getSession();
        if (error) throw error;

        if (linkError) {
            showLogin('Invitation or reset link could not be used: ' + linkError);
        } else if (session && ['invite', 'recovery'].includes(initialLinkType)) {
            showPasswordSetup(initialLinkType);
        } else if (session && passwordSetupRequired) {
            // The auth event already opened the password-creation form.
        } else if (session) {
            await openDashboard(session.user);
        } else if (['invite', 'recovery'].includes(initialLinkType)) {
            showLogin('This link has expired or is invalid. Ask the administrator for a new invitation, or use Forgot your password.');
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin('Unable to complete account setup: ' + error.message);
    }
}

$('passwordSetupForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!db) return;
    const password = $('newPassword').value;
    if (password.length < 8) {
        $('passwordMessage').textContent = 'Use at least 8 characters.';
        return;
    }
    if (password !== $('confirmPassword').value) {
        $('passwordMessage').textContent = 'The passwords do not match.';
        return;
    }
    const button = $('passwordSetupForm').querySelector('[type="submit"]');
    button.disabled = true;
    $('passwordMessage').textContent = 'Saving your password…';
    try {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        passwordSetupRequired = false;
        // Remove any auth link parameters remaining in the address bar.
        window.history.replaceState({}, document.title, window.location.pathname);
        const { data: { user }, error: userError } = await db.auth.getUser();
        if (userError || !user) throw userError || new Error('Please sign in with your new password.');
        await openDashboard(user);
    } catch (error) {
        $('passwordMessage').textContent = 'Unable to save password: ' + error.message;
    } finally {
        button.disabled = false;
    }
});

$('cancelPasswordSetup').addEventListener('click', async () => {
    if (db) await db.auth.signOut();
    passwordSetupRequired = false;
    showLogin();
});

$('forgotPassword').addEventListener('click', () => {
    $('recoveryEmail').value = $('email').value.trim();
    $('recoveryMessage').textContent = '';
    $('recoveryForm').hidden = false;
    $('loginForm').hidden = true;
    $('forgotPassword').hidden = true;
});

$('cancelRecovery').addEventListener('click', () => {
    $('recoveryForm').hidden = true;
    $('loginForm').hidden = false;
    $('forgotPassword').hidden = false;
    $('recoveryMessage').textContent = '';
});

$('recoveryForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!db) return;
    const button = $('recoveryForm').querySelector('[type="submit"]');
    button.disabled = true;
    $('recoveryMessage').textContent = 'Sending password reset link…';
    try {
        const { error } = await db.auth.resetPasswordForEmail(
            $('recoveryEmail').value.trim(),
            { redirectTo: new URL('family.html', window.location.href).origin +
                new URL('family.html', window.location.href).pathname }
        );
        if (error) throw error;
        $('recoveryMessage').textContent =
            'If this email belongs to an existing account, a reset link will be sent. Check your inbox and spam folder.';
    } catch (error) {
        $('recoveryMessage').textContent = 'Unable to send reset link: ' + error.message;
    } finally {
        button.disabled = false;
    }
});

async function openDashboard(user) {
    const { data: member, error } = await db.from('family_members').select('role').eq('user_id', user.id).maybeSingle();
    if (error || !member) {
        await db.auth.signOut();
        showLogin('This account has not been approved by the family administrator.');
        return;
    }
    memberRole = member.role;
    $('login').hidden = true;
    $('dashboard').hidden = false;
    $('welcome').textContent = `Signed in as ${user.email} · ${memberRole}`;
    $('addTask').hidden = !writeAllowed();
    await refresh();
}
async function refresh() { const { data, error } = await db.from('tasks').select('*').order('created_at', { ascending: false }); if (error) {
    $('taskMessage').textContent = 'Unable to load tasks: ' + error.message;
    return;
} tasks = data || []; render(); }
function render() {
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const progressing = tasks.filter(t => t.status === 'In progress').length;
    $('total').textContent = tasks.length;
    $('completed').textContent = completed;
    $('inProgress').textContent = progressing;
    const pct = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    $('percentage').textContent = pct + '%';
    $('progressBar').style.width = pct + '%';
    const planned = tasks.reduce((a, t) => a + Number(t.budget || 0), 0);
    const actual = tasks.reduce((a, t) => a + Number(t.actual || 0), 0);
    $('budgetTotal').textContent = money(planned);
    $('spentTotal').textContent = money(actual);
    $('budgetSummary').textContent = (actual > planned ? 'Spending above estimate by ' : 'Remaining estimated budget: ') + money(Math.abs(planned - actual)) + ' · Confirm the currency with the family treasurer.';
    renderBreakdowns();
    const cats = [...new Set(tasks.map(t => t.category))].sort();
    const existing = $('filterCategory').value;
    $('filterCategory').replaceChildren(new Option('All categories', ''), ...cats.map(c => new Option(c, c)));
    $('filterCategory').value = cats.includes(existing) ? existing : '';
    const term = $('searchTasks').value.trim().toLocaleLowerCase();
    const rows = tasks.filter(t => (!$('filterCategory').value || t.category === $('filterCategory').value) && (!$('filterStatus').value || t.status === $('filterStatus').value) && (!term || [t.title, t.category, t.assigned_to, t.notes].some(v => String(v ?? '').toLocaleLowerCase().includes(term))));
    $('taskRows').innerHTML = rows.map(t => `<tr><td><strong>${escapeHTML(t.title)}</strong><div class="muted">${escapeHTML(t.category)}</div></td><td>${escapeHTML(t.assigned_to || '—')}</td><td>${escapeHTML(t.due_date || '—')}</td><td><span class="status ${statusClass(t.status)}">${escapeHTML(t.status)}</span></td><td>${money(t.budget)}</td><td>${money(t.actual)}</td><td>${writeAllowed() ? `<button class="text-button" type="button" data-edit="${t.id}" aria-label="Edit ${escapeHTML(t.title)}">Edit</button>` : 'View only'}${deleteAllowed() ? ` <button class="text-button" type="button" data-delete="${t.id}" aria-label="Delete ${escapeHTML(t.title)}" style="color:#a44747">Delete</button>` : ''}</td></tr>`).join('');
    $('taskMessage').textContent = rows.length ? '' : tasks.length ? 'No tasks match the filters.' : 'No preparation tasks yet. Add your first task.';
}
$('loginForm').addEventListener('submit', async (e) => { e.preventDefault(); if (!db)
    return; $('loginMessage').textContent = 'Signing in…'; const { data, error } = await db.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value }); if (error) {
    $('loginMessage').textContent = error.message;
    return;
} await openDashboard(data.user); });
$('logout').addEventListener('click', async () => { if (db)
    await db.auth.signOut(); showLogin(); });
$('filterStatus').addEventListener('change', render);
$('filterCategory').addEventListener('change', render);
$('searchTasks').addEventListener('input', render);
$('refreshTasks').addEventListener('click', () => { if (db && $('dashboard').hidden === false)
    refresh(); });
function renderBreakdowns() {
    const groups = [...new Set(tasks.map(t => t.category))].sort();
    $('categoryBreakdown').innerHTML = groups.length ? groups.map(c => { const total = tasks.filter(t => t.category === c).length, done = tasks.filter(t => t.category === c && t.status === 'Completed').length; return `<div class="breakdown-row"><div class="breakdown-top"><strong>${escapeHTML(c)}</strong><span>${done} / ${total}</span></div><div class="mini-progress"><span style="width:${100 * done / total}%"></span></div></div>`; }).join('') : '<p class="muted">Categories appear once tasks have been added.</p>';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 7);
    const urgent = tasks.filter(t => t.due_date && t.status !== 'Completed').map(t => ({ ...t, when: new Date(t.due_date + 'T12:00:00') })).filter(t => t.when <= tomorrow).sort((a, b) => a.when - b.when).slice(0, 5);
    $('upcomingTasks').innerHTML = urgent.length ? urgent.map(t => `<div class="attention-item"><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.assigned_to || 'Unassigned')}</small></div><span class="${t.when < today ? 'due-overdue' : 'due-soon'}">${t.when < today ? 'Overdue' : 'Due'} · ${escapeHTML(t.due_date)}</span></div>`).join('') : '<p class="muted">No overdue or upcoming tasks in the next seven days.</p>';
}
$('exportCsv').addEventListener('click', () => { if ($('dashboard').hidden)
    return; const fields = ['title', 'category', 'status', 'assigned_to', 'due_date', 'budget', 'actual', 'notes']; const quote = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; const csv = [fields.map(quote).join(','), ...tasks.map(t => fields.map(f => quote(t[f])).join(','))].join('\r\n'); const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'family-burial-tasks.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
function openEditor(task) { $('taskForm').reset(); $('formError').textContent = ''; $('dialogTitle').textContent = task ? 'Edit task' : 'Add task'; $('taskId').value = task?.id || ''; $('taskTitle').value = task?.title || ''; $('taskCategory').value = task?.category || 'Funeral arrangements'; $('taskStatus').value = task?.status || 'Not started'; $('taskOwner').value = task?.assigned_to || ''; $('taskDue').value = task?.due_date || ''; $('taskBudget').value = task?.budget ?? 0; $('taskActual').value = task?.actual ?? 0; $('taskNotes').value = task?.notes || ''; $('taskDialog').showModal(); }
$('addTask').addEventListener('click', () => { if (writeAllowed())
    openEditor(null); });
// Event delegation supports Edit and Admin-only Delete actions for every task row.
$('taskRows').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-edit], button[data-delete]');
    if (!button || button.disabled) return;

    const taskId = button.dataset.edit || button.dataset.delete;
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;

    // Editors and Admins can edit tasks.
    if (button.dataset.edit) {
        if (writeAllowed()) openEditor(task);
        return;
    }

    // Only Admins may delete tasks. Supabase RLS independently enforces this.
    if (!deleteAllowed()) return;

    const confirmed = window.confirm(
        `Delete "${task.title}"?\n\nThis permanently removes the task and its budget details. This action cannot be undone.`
    );
    if (!confirmed) return;

    button.disabled = true;
    $('taskMessage').textContent = 'Deleting task…';

    try {
        // select() returns the deleted row so we can detect an RLS rejection
        // that otherwise might return no error but delete zero rows.
        const { data, error } = await db
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .select('id');

        if (error) throw error;
        if (!data || data.length !== 1) {
            throw new Error('The task was not deleted. Confirm your Admin permissions and refresh.');
        }

        await refresh(); // Recalculates task counts, progress and budgets.
        $('taskMessage').textContent = `Deleted task: ${task.title}`;
    } catch (error) {
        $('taskMessage').textContent = `Unable to delete task: ${error.message}`;
        button.disabled = false;
    }
});
$('cancelTask').addEventListener('click', () => $('taskDialog').close());
$('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!writeAllowed())
        return;
    const payload = { title: $('taskTitle').value.trim(), category: $('taskCategory').value, status: $('taskStatus').value, assigned_to: $('taskOwner').value.trim() || null, due_date: $('taskDue').value || null, budget: Number($('taskBudget').value) || 0, actual: Number($('taskActual').value) || 0, notes: $('taskNotes').value.trim() || null };
    if (!payload.title) {
        $('formError').textContent = 'Please enter a task title.';
        return;
    }
    const id = $('taskId').value;
    const result = id ? await db.from('tasks').update(payload).eq('id', id) : await db.from('tasks').insert(payload);
    if (result.error) {
        $('formError').textContent = result.error.message;
        return;
    }
    $('taskDialog').close();
    await refresh();
});
initialize();

