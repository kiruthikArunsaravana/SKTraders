'use server';
/**
 * @fileOverview A flow for generating financial report analysis using AI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const generateReport = ai.defineFlow(
  {
    name: 'generateReport',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (contextString) => {
    const prompt = `
      You are a financial analyst for a company that sells coconut-based products.
      Your task is to provide a concise analysis based on a set of financial transactions and a user's request.

      Analyze the following data:
      ${contextString}

      Based on the data and the user's request, provide a clear and insightful summary.
      Focus on key trends, totals, and the most significant categories.
      Do not output JSON or any other format, just the text of the analysis.
      The analysis should be a single block of text.
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-flash',
      config: {
        temperature: 0.3,
      },
    });

    return llmResponse.text();
  }
);
