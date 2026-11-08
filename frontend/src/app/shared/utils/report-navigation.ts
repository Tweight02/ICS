import { ActivatedRoute, Router } from '@angular/router';

const REPORT_RETURN_QUERY_PARAMS = [
  'return_to',
  'return_department',
  'return_expanded',
  'return_church',
  'return_search',
  'return_scroll',
  'return_quarter'
] as const;

export function captureReportReturnQueryParams(
  route: ActivatedRoute
): Record<string, string> {
  const queryParamMap = route.snapshot.queryParamMap;

  return REPORT_RETURN_QUERY_PARAMS.reduce<Record<string, string>>(
    (params, key) => {
      const value = queryParamMap.get(key);
      if (value !== null) {
        params[key] = value;
      }
      return params;
    },
    {}
  );
}

export function clearReportReturnQueryParams(
  router: Router,
  route: ActivatedRoute
): void {
  const queryParamMap = route.snapshot.queryParamMap;
  const queryParams = REPORT_RETURN_QUERY_PARAMS.reduce<Record<string, null>>(
    (params, key) => {
      if (queryParamMap.get(key) !== null) {
        params[key] = null;
      }
      return params;
    },
    {}
  );

  if (Object.keys(queryParams).length === 0) {
    return;
  }

  void router.navigate([], {
    relativeTo: route,
    queryParams,
    queryParamsHandling: 'merge',
    replaceUrl: true
  });
}
