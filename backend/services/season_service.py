from datetime import date
from typing import Optional, Tuple


def normalize_season_year(
    season_year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Optional[int]:
    if season_year is not None:
        return int(season_year)

    if start_date:
        return start_date.year

    if end_date:
        return end_date.year

    return None


def resolve_monitoring_window(
    season_year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Tuple[date, date, int]:
    resolved_season = normalize_season_year(season_year, start_date, end_date) or date.today().year

    if start_date and end_date:
        return start_date, end_date, resolved_season

    if start_date and not end_date:
        return start_date, date(resolved_season, 12, 31), resolved_season

    if end_date and not start_date:
        return date(resolved_season, 1, 1), end_date, resolved_season

    return date(resolved_season, 1, 1), date(resolved_season, 12, 31), resolved_season
