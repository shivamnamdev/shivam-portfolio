# Reference solution of the Python Batch 1 final exam, written from the exam text (v1.docx and v1_addon.docx).
# Used only by the tests: it must score 100, and variants of it show the grader accepts different but correct styles.
import json
import os

# ---- Q1 ----
students = [
    ["Rahul", 78, 85, 90, 67, 72],
    ["Smeeta", 92, 88, 76, 95, 81],
    ["Amit", 55, 60, 45, 70, 65],
    ["Jaskeerat", 88, 91, 84, 79, 93],
    ["Niraj", 40, 52, 61, 73, 85]
]
averages = []
for s in students:
    total = 0
    for m in s[1:]:
        total += m
    averages.append([s[0], total / 5])
topper = averages[0]
lowest = averages[0]
for a in averages:
    if a[1] > topper[1]:
        topper = a
    if a[1] < lowest[1]:
        lowest = a
print("Topper:", topper[0], "(Avg: " + str(topper[1]) + ")")
print("Lowest:", lowest[0], "(Avg: " + str(lowest[1]) + ")")
good = []
for s in students:
    count = 0
    for m in s[1:]:
        if m > 80:
            count += 1
    if count >= 3:
        good.append(s[0])
print("Students with 3+ subjects above 80:", good)
ordered = averages[:]
for i in range(len(ordered)):
    for j in range(len(ordered) - 1 - i):
        if ordered[j][1] < ordered[j + 1][1]:
            ordered[j], ordered[j + 1] = ordered[j + 1], ordered[j]
print("Sorted by average:", [o[0] for o in ordered])
print("Improvement Report")
for s in students:
    print(s[0], "->", "Yes" if s[-1] > s[-2] else "No")

# ---- Q2 ----
password = "Pyth0n@School2025!"
first4, last4 = password[:4], password[-4:]
for label, part in (("First 4", first4), ("Last 4", last4)):
    print(label + ":", part)
    print("Has uppercase:", "Yes" if any(c.isupper() for c in part) else "No")
    print("Has digit:", "Yes" if any(c.isdigit() for c in part) else "No")
upper = lower = digit = special = 0
for c in password:
    if c.isupper():
        upper += 1
    elif c.islower():
        lower += 1
    elif c.isdigit():
        digit += 1
    else:
        special += 1
print("Character Counts")
print("Uppercase:", upper)
print("Lowercase:", lower)
print("Digits:", digit)
print("Special:", special)
print("Repeated patterns found:", "oo" if password.count("oo") else "none")
print("find():", password.find("oo"))
print("index():", password.index("oo"))
print("count():", password.count("oo"))
print("replace():", password.replace("oo", "**"))
reversed_pw = password[::-1]
print("Reversed Password:")
print(reversed_pw)
pal = []
for i in range(len(reversed_pw) - 2):
    part = reversed_pw[i:i + 3]
    if part == part[::-1]:
        pal.append(part)
print("Palindrome substrings:", pal)
masked = password[:2] + "*" * (len(password) - 4) + password[-2:]
print("Masked Password:")
print(masked)
score_points = 0
if upper and lower and digit and special:
    score_points += 1
if len(password) >= 10:
    score_points += 1
if not password.count("oo"):
    score_points += 1
print("Rating:", "Strong" if score_points == 3 else ("Medium" if score_points == 2 else "Weak"))

# ---- Q3 ----
employees = {
    101: {"name": "Rahul", "department": "IT", "salary": 45000, "attendance": 20},
    102: {"name": "Priya", "department": "HR", "salary": 55000, "attendance": 22},
    103: {"name": "Amit", "department": "IT", "salary": 30000, "attendance": 18},
    104: {"name": "Smeeta", "department": "Finance", "salary": 60000, "attendance": 21},
    105: {"name": "Niraj", "department": "HR", "salary": 25000, "attendance": 22}
}
by_dept = {}
for emp in employees.values():
    by_dept.setdefault(emp["department"], []).append(emp["salary"])
best, best_avg = None, -1
for dept, salaries in by_dept.items():
    avg = sum(salaries) / len(salaries)
    print(dept, "Average Salary =", avg)
    if avg > best_avg:
        best, best_avg = dept, avg
print("Highest Paying Department:", best)
print("Average Salary:", best_avg)
employees[103].update({"department": "Finance"})
print("Employee 103 transferred to Finance")
del employees[105]
print("Employee 105 removed")
employees[101]["salary"] += 10000
print("Employee 101 promoted")
print("Attendance popped from Smeeta:", employees[104]["attendance"])
print("FINAL PAYSLIPS")
for emp_id, emp in employees.items():
    deductions = 500 * (22 - emp["attendance"]) if emp["attendance"] < 22 else 0
    gross = emp["salary"]
    band = "Junior" if gross < 20000 else ("Mid" if gross <= 50000 else "Senior")
    print("Employee ID:", emp_id)
    print({"name": emp["name"], "gross": gross, "deductions": deductions, "net": gross - deductions, "band": band})

# ---- Q4 ----
def create_log_file(filename):
    try:
        f = open(filename, "x")
    except FileExistsError as e:
        print("File already exists:", e)
    else:
        f.close()
        print("Log created")
    finally:
        pass

def add_task(filename, task_name, priority):
    try:
        with open(filename, "a") as f:
            f.write(json.dumps({"task": task_name, "priority": priority}) + "\n")
    except IOError as e:
        print("Could not write:", e)

def read_tasks(filename):
    tasks = []
    try:
        with open(filename, "r") as f:
            for line in f:
                if line.strip():
                    tasks.append(json.loads(line))
    except FileNotFoundError as e:
        print("No such file:", e)
    except json.JSONDecodeError as e:
        print("Bad line:", e)
    return tasks

def search_task(filename, keyword):
    found = []
    try:
        with open(filename) as f:
            line = f.readline()
            while line:
                if keyword.lower() in line.lower():
                    found.append(json.loads(line))
                line = f.readline()
    except (FileNotFoundError, ValueError) as e:
        print("Search failed:", e)
    for t in found:
        print(t)
    return found

def delete_task(filename, task_name):
    try:
        tasks = read_tasks(filename)
        kept = [t for t in tasks if t.get("task") != task_name]
        if len(kept) == len(tasks):
            raise KeyError(task_name)
        with open(filename, "w") as f:
            for t in kept:
                f.write(json.dumps(t) + "\n")
    except KeyError as e:
        print("Task not found:", e)

def generate_report(filename, report_file):
    out = None
    try:
        tasks = read_tasks(filename)
        out = open(report_file, "w")
        for i, t in enumerate(tasks, 1):
            out.write(str(i) + ". " + t["task"] + " (" + str(t["priority"]) + ")\n")
    except (IOError, KeyError) as e:
        print("Report failed:", e)
    else:
        print("Report written")
    finally:
        if out:
            out.close()

# ---- Q5 ----
from abc import ABC, abstractmethod

class HospitalSystem(ABC):
    @abstractmethod
    def execute(self):
        pass

class Person:
    hospital_name = "City Care Hospital"

    def __init__(self, name, age, contact):
        self.name = name
        self._contact = contact
        self.__age = age

    def get_age(self):
        return self.__age

    def show(self):
        print(f"Name: {self.name}, Contact: {self._contact}")

class Doctor(Person):
    def __init__(self, name, age, contact, specialization):
        super().__init__(name, age, contact)
        self.specialization = specialization
        self.patients_treated = []
        self.available_days = set()
        self.cabin = (2, 5)

    def add_patient(self, patient_name):
        self.patients_treated.append(patient_name)

    def set_availability(self, day):
        self.available_days.add(day)

    def show(self, detail=False):
        if detail:
            print(self.__dict__)
        else:
            print(f"Dr. {self.name} - {self.specialization}")

    def execute(self):
        print(f"Dr. {self.name} is on duty.")

    def show_cabin(self):
        floor, room = self.cabin
        print(f"Dr. {self.name} - Floor: {floor}, Room: {room}")

class Patient(Person):
    def __init__(self, name, age, contact, disease):
        super().__init__(name, age, contact)
        self.disease = disease
        self.__bills = []

    def add_bill(self, amount):
        self.__bills.append(amount)

    def get_total_bill(self):
        total = 0
        for bill in self.__bills:
            total += bill
        return total

    def calculate_discount(self):
        if self.get_total_bill() > 20000:
            return self.get_total_bill() * 0.10
        return 0

    def show(self, detail=False):
        if detail:
            print(f"Patient: {self.name}, Disease: {self.disease}, Bills: {self.__bills}")
        else:
            print(f"Patient: {self.name} - {self.disease}")

    def execute(self):
        print(f"Patient {self.name} checked in.")

class Hospital(HospitalSystem):
    def __init__(self):
        self.__doctors = []
        self.__patients = []

    def add_doctor(self, doctor):
        self.__doctors.append(doctor)

    def add_patient(self, patient):
        self.__patients.append(patient)

    def show_doctors(self):
        for doc in self.__doctors:
            doc.show()

    def show_patients(self):
        for pat in self.__patients:
            pat.show()

    def find_doctor(self, name):
        for doc in self.__doctors:
            if doc.name == name:
                return doc
        return None

    def discharge_patient(self, patient_name):
        for pat in self.__patients:
            if pat.name == patient_name:
                self.__patients.remove(pat)
                print(patient_name, "discharged successfully")
                return
        print("Patient not found")

    def get_doctor_report(self, doctor_name):
        doc = self.find_doctor(doctor_name)
        if doc is None:
            print("Doctor not found")
            return None
        return {"name": "Dr. " + doc.name, "specialization": doc.specialization,
                "patients_count": len(doc.patients_treated), "available_days": doc.available_days}

    def execute(self):
        print("Hospital system running...")

h = Hospital()
d1 = Doctor("Sharma", 45, "9876543210", "Cardiology")
d1.set_availability("Monday")
d1.set_availability("Thursday")
d1.add_patient("Rahul")
d2 = Doctor("Verma", 38, "8765432109", "Neurology")
p1 = Patient("Rahul", 30, "7654321098", "Heart Block")
p1.add_bill(15000)
p1.add_bill(8000)
p2 = Patient("Priya", 25, "6543210987", "Migraine")
h.add_doctor(d1)
h.add_doctor(d2)
h.add_patient(p1)
h.add_patient(p2)
h.show_doctors()
h.show_patients()
print(f"Rahul's total bill: {p1.get_total_bill()}")
print(f"Dr. Sharma's age: {d1.get_age()}")
print(d1.specialization)
d1.execute()
p1.execute()
h.execute()
print(h.get_doctor_report("Sharma"))
print(p1.calculate_discount())
d1.show_cabin()
h.discharge_patient("Priya")

# ---- menu (last, so a missing answer ends the program without hiding the output above) ----
while True:
    try:
        choice = int(input("Choice: "))
    except ValueError:
        print("Please type a number")
        continue
    except EOFError:
        break
    if choice == 7:
        break
