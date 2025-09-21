'use server';

/**
 * @fileOverview This file defines a Genkit flow for assisting users in building molecules by suggesting valid combinations and providing hints based on chemistry rules.
 *
 * - assistMoleculeAssembly - A function that handles the molecule assembly assistance process.
 * - AssistMoleculeAssemblyInput - The input type for the assistMoleculeAssembly function.
 * - AssistMoleculeAssemblyOutput - The return type for the assistMoleculeAssembly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssistMoleculeAssemblyInputSchema = z.object({
  atom1: z.string().describe('The symbol of the first atom.'),
  atom2: z.string().describe('The symbol of the second atom.'),
  attemptedBond: z.string().describe('A description of how the user is attempting to bond the two atoms.'),
});
export type AssistMoleculeAssemblyInput = z.infer<typeof AssistMoleculeAssemblyInputSchema>;

const AssistMoleculeAssemblyOutputSchema = z.object({
  isValidCombination: z.boolean().describe('Whether the combination of atoms is valid according to chemistry rules.'),
  hint: z.string().describe('A hint or explanation about why the combination is valid or invalid.'),
});
export type AssistMoleculeAssemblyOutput = z.infer<typeof AssistMoleculeAssemblyOutputSchema>;

export async function assistMoleculeAssembly(input: AssistMoleculeAssemblyInput): Promise<AssistMoleculeAssemblyOutput> {
  return assistMoleculeAssemblyFlow(input);
}

const moleculeAssemblyPrompt = ai.definePrompt({
  name: 'moleculeAssemblyPrompt',
  input: {schema: AssistMoleculeAssemblyInputSchema},
  output: {schema: AssistMoleculeAssemblyOutputSchema},
  prompt: `You are an expert chemistry assistant. A user is trying to combine two atoms in a molecule builder.

  Atom 1: {{{atom1}}}
  Atom 2: {{{atom2}}}
  Attempted Bond: {{{attemptedBond}}}

  Determine if the combination is valid according to the rules of chemistry. Provide a helpful hint to the user, explaining why the combination is valid or invalid.  Be concise.

  Is Valid Combination: {{isValidCombination}}
  Hint: {{hint}}`,
});

const assistMoleculeAssemblyFlow = ai.defineFlow(
  {
    name: 'assistMoleculeAssemblyFlow',
    inputSchema: AssistMoleculeAssemblyInputSchema,
    outputSchema: AssistMoleculeAssemblyOutputSchema,
  },
  async input => {
    const {output} = await moleculeAssemblyPrompt(input);
    return output!;
  }
);
