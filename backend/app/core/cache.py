import time
import functools
import threading
from typing import Any, Dict, Optional, Tuple

class SimpleTTLCache:
    """Thread-safe in-memory key-value cache with TTL expiration and pattern invalidation."""
    def __init__(self, default_ttl: int = 300):
        self.default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            val, expire_at = self._cache[key]
            if time.time() > expire_at:
                del self._cache[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if ttl is None:
            ttl = self.default_ttl
        expire_at = time.time() + ttl
        with self._lock:
            self._cache[key] = (value, expire_at)

    def invalidate_all(self) -> None:
        with self._lock:
            self._cache.clear()

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys_to_del = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_del:
                del self._cache[k]

# Global cache singleton instance
global_cache = SimpleTTLCache(default_ttl=300)
