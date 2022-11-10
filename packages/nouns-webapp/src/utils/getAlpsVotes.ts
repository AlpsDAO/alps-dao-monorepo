interface Vote {
  supportDetailed: 0 | 1 | 2;
  alpsRepresented: string[];
}

/**
 * Helper function to transform response from graph into flat list of alpIds that voted supportDetailed for the given prop
 *
 * @param votes - Graph response for alp vote query
 * @param supportDetailed - The integer support value: against (0), for (1), or abstain (2)
 * @returns - flat list of alpIds that voted supportDetailed for the given prop
 */
export const getAlpVotes = (votes: Vote[], supportDetailed: number) => {
  return votes.filter(v => v.supportDetailed === supportDetailed).flatMap(v => v.alpsRepresented);
};
