const fs = require('fs');
const file = 'src/features/outreach/PromptForm.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add state
content = content.replace(
  "const [customPrompt, setCustomPrompt] = useState('')",
  "const [customPrompt, setCustomPrompt] = useState('')\n  const [referralPrompt, setReferralPrompt] = useState('')"
);

// Add default template
const referralTemplate = `\n  const defaultReferralPromptTemplate = \`You are a professional outreach assistant. Write a personalized cold outreach email from a job applicant to a contact asking for a referral.

The output MUST be a valid JSON object matching this schema:
{
  "subject": "Email subject line",
  "body": "Email body in HTML"
}

[INPUT DETAILS]
Contact Name: {{recruiter_name}}
Company Name: {{company_name}}
Job Description:
{{job_description}}
Applicant Name: {{applicant_name}}
Applicant Email: {{applicant_email}}
Resume Raw Content:
{{resume_content}}
Google Drive Resume Link: {{drive_link}}

[INSTRUCTIONS]
1. Write a professional subject line.
2. In the body (HTML format using <p>, <strong>, <ul>, <li>, and <a>), politely ask for a referral for the provided job role. Highlight 2-3 specific skills/projects from the Resume Raw Content that match the Job Description. Use <strong> to highlight key metrics or tech.
3. Make sure to use the Google Drive Resume Link in a clean anchor tag '<a href="{{drive_link}}" style="color: #176b4a; font-weight: bold; text-decoration: underline;">view my complete resume on Google Drive</a>' in the body.
4. Keep the email concise and polite.
5. Output ONLY the raw JSON object. Do not include markdown code block wrappers (like triple backticks) or any conversational text outside the JSON.\``

content = content.replace("  const defaultPromptTemplate = `You are a professional outreach assistant.", referralTemplate + "\n\n  const defaultPromptTemplate = `You are a professional outreach assistant.");

// Update load
content = content.replace(
  "setCustomPrompt(data.custom_prompt || '')",
  "setCustomPrompt(data.custom_prompt || '')\n        setReferralPrompt(data.referral_prompt || '')"
);

// Update save
content = content.replace(
  "body: { custom_prompt: customPrompt },",
  "body: { custom_prompt: customPrompt, referral_prompt: referralPrompt },"
);
content = content.replace(
  "setCustomPrompt(data.custom_prompt || '')\n      setSuccess('Outreach prompt preference saved successfully!')",
  "setCustomPrompt(data.custom_prompt || '')\n      setReferralPrompt(data.referral_prompt || '')\n      setSuccess('Outreach prompt preference saved successfully!')"
);

// Update reset
content = content.replace(
  "body: { custom_prompt: '' },",
  "body: { custom_prompt: '', referral_prompt: '' },"
);
content = content.replace(
  "setCustomPrompt('')\n      setSuccess('Reset to system default prompt completed!')",
  "setCustomPrompt('')\n      setReferralPrompt('')\n      setSuccess('Reset to system default prompt completed!')"
);

// Add to UI
const textareas = `<label>
              <span>Custom System Prompt (Outreach)</span>
              <textarea
                rows={18}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Leave blank to use default outreach system prompt..."
                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
              />
            </label>
            <label>
              <span>Custom System Prompt (Referral)</span>
              <textarea
                rows={18}
                value={referralPrompt}
                onChange={(e) => setReferralPrompt(e.target.value)}
                placeholder="Leave blank to use default referral system prompt..."
                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', marginTop: '10px' }}
              />
              <small style={{ color: 'var(--muted)', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
                If blank, the system automatically runs the default optimized prompts. You can insert variables using double curly braces (e.g., <code>{"{{recruiter_name}}"}</code>).
              </small>
            </label>`;

content = content.replace(
  /<label>[\s\S]*?<span>Custom System Prompt<\/span>[\s\S]*?<\/label>/,
  textareas
);

// Add referral template to UI
const defaultTemplatesUI = `{showDefaultPrompt && (
              <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                    Default Outreach Prompt:
                  </span>
                  <pre style={{ background: '#f8faf7', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '300px' }}>
                    {defaultPromptTemplate}
                  </pre>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                    Default Referral Prompt:
                  </span>
                  <pre style={{ background: '#f8faf7', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '300px' }}>
                    {defaultReferralPromptTemplate}
                  </pre>
                </div>
              </div>
            )}`;

content = content.replace(
  /{showDefaultPrompt && \([\s\S]*?\)\s*}/,
  defaultTemplatesUI
);

fs.writeFileSync(file, content);
