from enum import Enum
class BaseEnum(Enum):
    """Base para os Enums do projeto"""
    @classmethod
    def as_list(cls):
        """Retorna os itens do enum como uma lista"""
        return list(map(lambda c: c.value, cls))