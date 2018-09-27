---
title: Employee Directory
---

| name | email | phone | 
| ---- | ----- | ----- | {{~ context.data.employees :employee}}
| {{= employee.name }} | {{= employee.email }} | {{= employee.phone }} | {{~}}
