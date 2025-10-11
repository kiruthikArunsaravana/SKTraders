
'use server';

import { z } from 'zod';
import { generateReport } from '@/ai/flows/generate-report';
import { format } from 'date-fns';

const reportSchema = z.object({
  reportDescription: z.string().min(1),
  dateRange1From: z.string().min(1),
  dateRange1To: z.string().min(1),
  dateRange2From: z.string().optional(),
  dateRange2To: z.string().optional(),
});

type ReportState = {
  report: string | null;
  error: string | null;
};

export async function handleGenerateFinanceReport(
  prevState: ReportState,
  formData: FormData
): Promise<ReportState> {
  
  const rawFormData = {
    reportDescription: formData.get('reportDescription'),
    dateRange1From: formData.get('dateRange1.from'),
    dateRange1To: formData.get('dateRange1.to'),
    dateRange2From: formData.get('dateRange2.from') || undefined,
    dateRange2To: formData.get('dateRange2.to') || undefined,
  };

  try {
    const validatedFields = reportSchema.parse(rawFormData);
    
    const input = {
        reportDescription: validatedFields.reportDescription,
        fromDate1: format(new Date(validatedFields.dateRange1From), 'yyyy-MM-dd'),
        toDate1: format(new Date(validatedFields.dateRange1To), 'yyyy-MM-dd'),
        fromDate2: validatedFields.dateRange2From && validatedFields.dateRange2To ? format(new Date(validatedFields.dateRange2From), 'yyyy-MM-dd') : 'N/A',
        toDate2: validatedFields.dateRange2From && validatedFields.dateRange2To ? format(new Date(validatedFields.dateRange2To), 'yyyy-MM-dd') : 'N/A',
    };
    
    const result = await generateReport(input);

    if (!result.report) {
      return {
        report: null,
        error: 'The AI could not generate a report with the provided data.',
      };
    }

    return { report: result.report, error: null };
  } catch (error) {
    console.error('Error generating report:', error);
    if (error instanceof z.ZodError) {
        return { report: null, error: "Validation failed: " + error.errors.map(e => e.message).join(', ') };
    }
    return {
      report: null,
      error: 'An unexpected error occurred while generating the report. Please check the inputs and try again.',
    };
  }
}
