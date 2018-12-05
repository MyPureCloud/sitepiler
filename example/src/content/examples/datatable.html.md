---
title: Dynamically generate a table
---

This page demonstrates looping through an array (`context.data.employees`) to add rows to a table. The `employees` array comes from loading the file `example/data/employees.json`. All data in the file is fictitious. 

| name | email | phone | 
| ---- | ----- | ----- | {{~ context.data.employees :employee}}
| {{= employee.name }} | {{= employee.email }} | {{= employee.phone }} | {{~}}
