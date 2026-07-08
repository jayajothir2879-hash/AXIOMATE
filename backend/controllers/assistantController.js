// controllers/assistantController.js
const { pool } = require('../config/db');
const { computeRisk } = require('../utils/riskEngine');

// POST /api/assistant/ask   { question: "Which projects are delayed?" }
exports.ask = async (req, res) => {
  const q = (req.body.question || '').toLowerCase();
  const projectsRes = await pool.query(
    `SELECT p.*, c.name AS client_name FROM projects p LEFT JOIN clients c ON c.id = p.client_id`
  );
  const employeesRes = await pool.query('SELECT * FROM employees');
  const clientsRes = await pool.query('SELECT * FROM clients');

  const employees = employeesRes.rows;
  const clients = clientsRes.rows;

  const withRisk = projectsRes.rows.map(p => {
    const names = (p.assigned_employees || '').split(',').map(s => s.trim()).filter(Boolean);
    const team = employees.filter(e => names.includes(e.name));
    return { ...p, risk: computeRisk(p, team) };
  });

  let answer;
  if (q.includes('delay')) {
    const list = withRisk.filter(p => p.status === 'Delayed');
    answer = list.length
      ? 'Delayed projects: ' + list.map(p => `${p.name} (${p.client_name}, ${p.progress}% complete)`).join(', ')
      : 'No projects are currently marked Delayed.';
  } else if (q.includes('overload')) {
    const list = employees.filter(e => e.workload === 'Overloaded' || Number(e.weekly_hours) > 40);
    answer = list.length
      ? 'Overloaded employees: ' + list.map(e => `${e.name} (${e.weekly_hours}h/week)`).join(', ')
      : 'No employees are currently overloaded.';
  } else if (q.includes('high-risk') || q.includes('high risk')) {
    const list = withRisk.filter(p => p.risk.level === 'High');
    answer = list.length
      ? 'High-risk projects: ' + list.map(p => `${p.name} — ${p.risk.reasons[0]}`).join('; ')
      : 'No projects are currently classified as High Risk.';
  } else if (q.includes('client') && (q.includes('active') || q.includes('most') || q.includes('highest'))) {
    const top = [...clients].sort((a, b) => b.active_projects - a.active_projects)[0];
    answer = top ? `${top.name} currently has the most active projects (${top.active_projects}).` : 'No client data available.';
  } else if (q.includes('productiv')) {
    const top = [...employees].sort((a, b) => b.productivity_score - a.productivity_score)[0];
    answer = top ? `${top.name} has the highest productivity score at ${top.productivity_score}%.` : 'No employee data available.';
  } else if (q.includes('total project')) {
    answer = `There are ${projectsRes.rows.length} total projects in the portfolio.`;
  } else {
    answer = 'I can help with questions like delayed projects, overloaded employees, high-risk projects, or top clients by active project count.';
  }

  res.json({ question: req.body.question, answer });
};
