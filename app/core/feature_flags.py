import os
from typing import Dict


class FeatureFlags:
    _flags: Dict[str, bool] = {}

    @classmethod
    def is_enabled(cls, flag_name: str) -> bool:
        if flag_name not in cls._flags:
            cls._flags[flag_name] = os.getenv(flag_name, "false").lower() == "true"
        return cls._flags[flag_name]

    @classmethod
    def reset(cls) -> None:
        cls._flags = {}
