// Jira base URL for deep-linking ticket IDs (e.g. "https://yourcompany.atlassian.net/browse/").
// Update this once and every ticket in the drill-down dialog becomes clickable.
export const JIRA_BASE_URL = "https://yourcompany.atlassian.net/browse/";

export const jiraUrl = (ticketId: string) => `${JIRA_BASE_URL}${ticketId}`;
