"""Read the live board of Kawai2004 v1.01 (read-only).

Usage:
    python read_board.py
    python read_board.py --json

The original game must already be running in the windowed compatibility
package. This script never writes to the process.
"""

from __future__ import annotations

import argparse
import json
import struct

import pymem
import pymem.process

IMAGE_BASE = 0x400000
BOARD_DESCRIPTOR = 0x41F0F0
BOARD_POINTER_FIELD = 0x41F118
BOARD_COLUMNS = 18
BOARD_ROWS = 11
CELL_BYTES = 6
SCORE_ADDRESS = 0x41F140
REMAINING_ADDRESS = 0x41F13C
TIMER_ADDRESS = 0x41F1B4


def attach():
    errors = []
    for name in ("Kawai2004.exe", "Kawai2004"):
        try:
            return pymem.Pymem(name)
        except Exception as exc:  # pymem raises different errors by platform
            errors.append(f"{name}: {exc}")
    raise SystemExit("Kawai2004 is not running. Start the windowed package first.")


def module_base(pm):
    module = pymem.process.module_from_name(pm.process_handle, "Kawai2004.exe")
    if module is None:
        raise SystemExit("Kawai2004.exe module not found in the process.")
    return module.lpBaseOfDll


def read_va(pm, base, address, size):
    return pm.read_bytes(base + (address - IMAGE_BASE), size)


def read_u16(pm, base, address):
    return struct.unpack("<H", read_va(pm, base, address, 2))[0]


def read_u32(pm, base, address):
    return struct.unpack("<I", read_va(pm, base, address, 4))[0]


def read_board(pm, base):
    descriptor = read_va(pm, base, BOARD_DESCRIPTOR, 0x80)
    pointer = struct.unpack_from(
        "<I", descriptor, BOARD_POINTER_FIELD - BOARD_DESCRIPTOR
    )[0]
    data = pm.read_bytes(pointer, BOARD_COLUMNS * BOARD_ROWS * CELL_BYTES)

    cells = []
    for row in range(BOARD_ROWS):
        row_cells = []
        for col in range(BOARD_COLUMNS):
            offset = (col + row * BOARD_COLUMNS) * CELL_BYTES
            present, visual_id, match_id = struct.unpack_from(
                "<HHH", data, offset
            )
            row_cells.append(
                {
                    "row": row,
                    "col": col,
                    "present": present,
                    "visual_id": visual_id,
                    "match_id": match_id,
                }
            )
        cells.append(row_cells)
    return pointer, cells


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    pm = attach()
    base = module_base(pm)
    pointer, cells = read_board(pm, base)
    result = {
        "process_id": pm.process_id,
        "module_base": hex(base),
        "board_pointer": hex(pointer),
        "score": read_u32(pm, base, SCORE_ADDRESS),
        "remaining": read_u16(pm, base, REMAINING_ADDRESS),
        "timer_ms": read_u32(pm, base, TIMER_ADDRESS),
        "columns": BOARD_COLUMNS,
        "rows": BOARD_ROWS,
        "cells": cells,
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(
        "pid={process_id} base={module_base} board={board_pointer} "
        "score={score} remaining={remaining} timer_ms={timer_ms}".format(**result)
    )
    for row in range(1, 10):
        values = []
        for col in range(1, 17):
            cell = cells[row][col]
            if cell["present"]:
                values.append(
                    f"{cell['visual_id']:02x}/{cell['match_id']:02x}"
                )
            else:
                values.append("......")
        print(f"row {row:02d}: " + " ".join(values))


if __name__ == "__main__":
    main()
