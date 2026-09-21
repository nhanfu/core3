# Source comparison

| Odoo | Core3 | Result |
| --- | --- | --- |
| In Contract domain | `in_contract` projection/filter in employees API/page YAML | implemented |
| Out of Contract domain | `out_of_contract` projection/filter in employees API/page YAML | implemented |
| Manager-only group | Existing list source remains `employees.read`; YAML has no filter-level permission key | conditional/open shared contract |
| Durable date data | Migration 092 expired fixture and lookup index | implemented |
