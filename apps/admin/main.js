const app = document.getElementById('app');
const tokenInput = document.getElementById('token');
const apiInput = document.getElementById('apiBase');
tokenInput.value = localStorage.getItem('adminToken') || '';
apiInput.value = localStorage.getItem('apiBase') || apiInput.value;
tokenInput.addEventListener('input', () => localStorage.setItem('adminToken', tokenInput.value));
apiInput.addEventListener('input', () => localStorage.setItem('apiBase', apiInput.value));

async function api(path, options = {}) {
  const res = await fetch(`${apiInput.value}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenInput.value ? { Authorization: `Bearer ${tokenInput.value}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function cell(value) {
  if (value === null || value === undefined) return '<span class="muted">-</span>';
  if (typeof value === 'object') return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  return escapeHtml(String(value));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function table(rows, columns, actions) {
  return `<table><thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}${actions ? '<th>Actions</th>' : ''}</tr></thead><tbody>
    ${rows.map((row) => `<tr>${columns.map((c) => `<td>${cell(row[c.key])}</td>`).join('')}${actions ? `<td class="actions">${actions(row)}</td>` : ''}</tr>`).join('')}
  </tbody></table>`;
}

async function render(title, loader) {
  app.innerHTML = `<h2>${title}</h2><p class="muted">Loading...</p>`;
  try {
    app.innerHTML = `<h2>${title}</h2>${await loader()}`;
  } catch (error) {
    app.innerHTML = `<h2>${title}</h2><div class="error">${escapeHtml(error.message)}</div>`;
  }
}

async function post(path, body = {}) {
  await api(path, { method: 'POST', body: JSON.stringify(body) });
  route();
}

async function patch(path, body = {}) {
  await api(path, { method: 'PATCH', body: JSON.stringify(body) });
  route();
}

async function del(path) {
  await api(path, { method: 'DELETE' });
  route();
}

const routes = {
  '/': () => render('Overview', async () => {
    const data = await api('/admin/overview');
    return `<div class="grid">${Object.entries(data).map(([k, v]) => `<div class="card"><div class="muted">${k}</div><div class="metric">${v}</div></div>`).join('')}</div>`;
  }),
  '/reports': () => render('Reports', async () => {
    const rows = await api('/admin/reports');
    return table(rows, [{ key: 'id', label: 'ID' }, { key: 'entityType', label: 'Entity' }, { key: 'reasonCode', label: 'Reason' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Created' }], (r) =>
      `<button onclick="post('/admin/reports/${r.id}/resolve',{reason:'Resolved from admin UI'})">Resolve</button><button class="secondary" onclick="post('/admin/reports/${r.id}/dismiss',{reason:'Dismissed from admin UI'})">Dismiss</button>`);
  }),
  '/verifications': () => render('Verification Requests', async () => {
    const rows = await api('/admin/verification-requests');
    return table(rows, [{ key: 'id', label: 'ID' }, { key: 'verificationType', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'submittedDataJson', label: 'Data' }], (r) =>
      `<button onclick="post('/admin/verification-requests/${r.id}/approve')">Approve</button><button class="danger" onclick="post('/admin/verification-requests/${r.id}/reject',{reason:'Rejected from admin UI'})">Reject</button>`);
  }),
  '/listings': () => render('Listing Moderation', async () => `<p class="muted">Use listing IDs from reports/search for moderation actions.</p>${actionForm('Listing ID', 'Approve', '/admin/listings/', '/approve')}${actionForm('Listing ID', 'Reject', '/admin/listings/', '/reject', true)}`),
  '/projects': () => render('Project Moderation', async () => `<p class="muted">Use project IDs from reports/search for moderation actions.</p>${actionForm('Project ID', 'Approve', '/admin/projects/', '/approve')}${actionForm('Project ID', 'Reject', '/admin/projects/', '/reject', true)}`),
  '/users': () => render('User Management', async () => {
    const rows = await api('/admin/users');
    return `${createAdminForm()}${table(rows.map((user) => ({
      ...user,
      name: user.profile?.fullName,
      rolesLabel: user.roles?.map((item) => item.role?.code).join(', '),
    })), [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phoneNumber', label: 'Phone' },
      { key: 'status', label: 'Status' },
      { key: 'rolesLabel', label: 'Roles' },
      { key: 'createdAt', label: 'Created' },
    ], (r) =>
      `<button onclick="post('/admin/users/${r.id}/approve')">Approve</button><button class="danger" onclick="post('/admin/users/${r.id}/block')">Block</button><button class="secondary" onclick="post('/admin/users/${r.id}/unblock')">Unblock</button><button onclick="addRole('${r.id}')">Add role</button>`)}`;
  }),
  '/promotions': () => render('Promotions', async () => `<p class="muted">Promotion management is available through owner APIs and lifecycle workers. Admin listing view is deferred.</p>`),
  '/subscriptions': () => render('Subscriptions', async () => table(await api('/subscriptions/plans'), [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'billingInterval', label: 'Interval' }, { key: 'priceAmount', label: 'Price' }])),
  '/payments': () => render('Payments', async () => {
    const rows = await api('/admin/payments');
    return table(rows, [{ key: 'id', label: 'ID' }, { key: 'entityType', label: 'Entity' }, { key: 'amount', label: 'Amount' }, { key: 'provider', label: 'Provider' }, { key: 'status', label: 'Status' }], (r) =>
      `<button onclick="confirmPost('/admin/payments/${r.id}/reconcile')">Reconcile</button>`);
  }),
  '/submissions': () => render('Inbound Submissions', async () => {
    const rows = await api('/admin/submissions');
    return `<p class="muted">Feedback, contact, and support submissions from the public site.</p>${table(rows, [
      { key: 'submissionType', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'subject', label: 'Subject' },
      { key: 'message', label: 'Message' },
      { key: 'createdAt', label: 'Created' },
    ], (r) =>
      `<button onclick="patch('/admin/submissions/${r.id}/status',{status:'in_progress',adminNotes:'Updated from admin UI'})">In progress</button><button onclick="patch('/admin/submissions/${r.id}/status',{status:'resolved',adminNotes:'Resolved from admin UI'})">Resolve</button><button class="secondary" onclick="patch('/admin/submissions/${r.id}/status',{status:'dismissed',adminNotes:'Dismissed from admin UI'})">Dismiss</button>`)}`;
  }),
  '/risk-flags': () => render('Risk Flags', async () => {
    const rows = await api('/admin/risk-flags');
    return table(rows, [{ key: 'id', label: 'ID' }, { key: 'entityType', label: 'Entity' }, { key: 'riskType', label: 'Risk' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }], (r) =>
      `<button onclick="post('/admin/risk-flags/${r.id}',{status:'resolved'})">Resolve</button><button class="secondary" onclick="post('/admin/risk-flags/${r.id}',{status:'dismissed'})">Dismiss</button>`);
  }),
  '/search-ops': () => render('Search Ops', async () => {
    const status = await api('/admin/search/status');
    return `<div class="card"><pre>${escapeHtml(JSON.stringify(status, null, 2))}</pre></div>
      <div class="toolbar">
        <button onclick="confirmPost('/admin/search/reindex/listings')">Reindex listings</button>
        <button onclick="confirmPost('/admin/search/reindex/projects')">Reindex projects</button>
        <button onclick="confirmPost('/admin/search/reindex/areas')">Reindex areas</button>
      </div>`;
  }),
  '/queues': () => render('Queues', async () => {
    const data = await api('/health/queues');
    return table(data.queues, [{ key: 'name', label: 'Queue' }, { key: 'waiting', label: 'Waiting' }, { key: 'active', label: 'Active' }, { key: 'failed', label: 'Failed' }, { key: 'delayed', label: 'Delayed' }]);
  }),
  '/audit-logs': () => render('Audit Logs', async () => table(await api('/admin/audit-logs'), [{ key: 'action', label: 'Action' }, { key: 'entityType', label: 'Entity' }, { key: 'entityId', label: 'Entity ID' }, { key: 'createdAt', label: 'Created' }])),
  '/analytics': () => render('Analytics Summary', async () => `<pre>${escapeHtml(JSON.stringify(await api('/admin/analytics/summary'), null, 2))}</pre><div class="toolbar"><button onclick="post('/admin/analytics/rollups/run',{scope:'all'})">Run rollups</button><button onclick="post('/admin/analytics/rollups/rebuild',{scope:'all'})">Rebuild today</button></div>`),
  '/cms/pages': () => render('CMS Pages', async () => cmsForm('pages')),
  '/cms/blog-posts': () => render('Blog Posts', async () => cmsForm('blog-posts')),
};

function actionForm(label, text, prefix, suffix, danger = false) {
  const id = `${prefix}${suffix}`.replace(/[^a-z]/g, '');
  return `<div class="card toolbar"><div><label>${label}</label><input id="${id}" /></div><button class="${danger ? 'danger' : ''}" onclick="post('${prefix}' + document.getElementById('${id}').value + '${suffix}', ${danger ? "{reason:'Updated from admin UI'}" : '{}'} )">${text}</button></div>`;
}

function cmsForm(type) {
  const titleId = `${type}-title`;
  return `<div class="card">
    <label>Title</label><input id="${titleId}" />
    <label>Content JSON</label><textarea id="${type}-content">{"blocks":[]}</textarea>
    <div class="toolbar"><button onclick="createCms('${type}','${titleId}','${type}-content')">Create draft</button><button onclick="createCms('${type}','${titleId}','${type}-content','published')">Create published</button></div>
  </div>`;
}

async function createCms(type, titleId, contentId, status = 'draft') {
  await api(`/cms/${type}`, {
    method: 'POST',
    body: JSON.stringify({ title: document.getElementById(titleId).value, contentJson: JSON.parse(document.getElementById(contentId).value), status }),
  });
  route();
}

function route() {
  const path = location.hash.slice(1) || '/';
  (routes[path] || routes['/'])();
}
window.post = post;
window.patch = patch;
window.del = del;
window.addRole = async (userId) => {
  const roleCode = prompt('Role code to add: buyer, tenant, owner, agent, developer, moderator, admin');
  if (roleCode) await post(`/admin/users/${userId}/roles`, { roleCode });
};
window.confirmPost = async (path, body = {}) => {
  if (confirm(`Run ${path}?`)) await post(path, body);
};
window.createCms = createCms;
window.addEventListener('hashchange', route);
route();

function createAdminForm() {
  return `<div class="card">
    <h3>Create admin user</h3>
    <div class="toolbar">
      <div><label>Email</label><input id="admin-email" /></div>
      <div><label>Phone</label><input id="admin-phone" /></div>
      <div><label>Password</label><input id="admin-password" type="password" /></div>
      <div><label>Full name</label><input id="admin-name" /></div>
      <button onclick="post('/admin/users/create-admin',{email:document.getElementById('admin-email').value,phoneNumber:document.getElementById('admin-phone').value,password:document.getElementById('admin-password').value,fullName:document.getElementById('admin-name').value})">Create admin</button>
    </div>
  </div>`;
}
