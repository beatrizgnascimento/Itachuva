
from shared.enums.base_enum import BaseEnum


class State(str, BaseEnum):
    """
        Estado atual do Random Forest: Treinamento ou Execução
    """

    TRAIN = "TRAIN"
    EXECUTION = "EXECUTION"