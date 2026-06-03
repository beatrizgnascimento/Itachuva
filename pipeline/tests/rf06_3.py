import unittest
from shared.utils.validate_files import verify_tiffs
from shared.config.env import init_env, get_env
import shutil
from tests.tests_helpers import file_generation

class GeneratedFilesTest(unittest.TestCase):
    def test_generated_files(self):

        init_env()
        shutil.rmtree(get_env()['GTIFF_OUT'])
        file_generation()

        target_vars = {"tp", "t2m", "r"}

        file_count, variables = verify_tiffs(target_vars, get_env()['GTIFF_OUT'])

        print("Variaveis encontradas:", variables)

        self.assertEqual(file_count, 27)
        self.assertTrue(target_vars.issubset(variables))

        shutil.rmtree(get_env()['GTIFF_OUT'])
        shutil.rmtree(get_env()['GRIB_OUT'])



if __name__ == "__main__":
    init_env()
    unittest.main()