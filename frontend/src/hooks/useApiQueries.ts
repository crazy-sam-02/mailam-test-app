import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiCreateTest,
  apiDeleteTest,
  apiGetAttemptsForTest,
  apiGetMyAttempts,
  apiGetNotAttendedForTest,
  apiGetStudents,
  apiGetTest,
  apiGetTests,
  apiLogin,
  apiLogout,
  apiMe,
  apiRegisterAdmin,
  apiRegisterStudent,
  apiStartAttempt,
  apiSubmitAttempt,
  apiUploadQuestions,
} from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiMe(),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useTestsQuery() {
  return useQuery({
    queryKey: queryKeys.tests.all,
    queryFn: () => apiGetTests(),
    staleTime: 20_000,
  });
}

export function useTestQuery(testId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: testId ? queryKeys.tests.detail(testId) : ['tests', 'detail', 'missing'],
    queryFn: () => {
      if (!testId) throw new Error('Missing testId');
      return apiGetTest(testId);
    },
    enabled: enabled && !!testId,
    staleTime: 20_000,
  });
}

export function useMyAttemptsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.attempts.my,
    queryFn: () => apiGetMyAttempts(),
    enabled,
    staleTime: 10_000,
  });
}

export function useStudentsQuery(params: Record<string, any>, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.students.list(params),
    queryFn: () => apiGetStudents(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useAttemptsForTestQuery(
  testId: string | null,
  params: Record<string, any>,
  enabled: boolean
) {
  return useQuery({
    queryKey: testId ? queryKeys.tests.attemptsForTest(testId, params) : ['tests', 'attempts', 'missing'],
    queryFn: () => {
      if (!testId) throw new Error('Missing testId');
      return apiGetAttemptsForTest(testId, params);
    },
    enabled: enabled && !!testId,
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  });
}

export function useNotAttendedForTestQuery(
  testId: string | null,
  params: Record<string, any>,
  enabled: boolean
) {
  return useQuery({
    queryKey: testId ? queryKeys.tests.notAttendedForTest(testId, params) : ['tests', 'not-attended', 'missing'],
    queryFn: () => {
      if (!testId) throw new Error('Missing testId');
      return apiGetNotAttendedForTest(testId, params);
    },
    enabled: enabled && !!testId,
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => apiLogin(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useRegisterStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => apiRegisterStudent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}

export function useRegisterAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => apiRegisterAdmin(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiLogout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useCreateTestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => apiCreateTest(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tests.all }),
  });
}

export function useDeleteTestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => apiDeleteTest(testId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tests.all }),
  });
}

export function useUploadQuestionsMutation() {
  return useMutation({
    mutationFn: (formData: FormData) => apiUploadQuestions(formData),
  });
}

export function useStartAttemptMutation() {
  return useMutation({
    mutationFn: (testId: string) => apiStartAttempt(testId),
  });
}

export function useSubmitAttemptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, body }: { testId: string; body: any }) => apiSubmitAttempt(testId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.attempts.my }),
  });
}
