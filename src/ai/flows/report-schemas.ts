import { z } from 'genkit';

export const GenerateReportOutputSchema = z.object({
  report: z.string().describe('The formatted financial report.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;
