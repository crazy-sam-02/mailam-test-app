export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  tests: {
    all: ['tests'] as const,
    detail: (testId: string) => ['tests', 'detail', testId] as const,
    attemptsForTest: (testId: string, params: Record<string, any>) =>
      ['tests', testId, 'attempts', params] as const,
    notAttendedForTest: (testId: string, params: Record<string, any>) =>
      ['tests', testId, 'not-attended', params] as const,
  },
  attempts: {
    my: ['attempts', 'my'] as const,
  },
  students: {
    list: (params: Record<string, any>) => ['students', params] as const,
  },
};
