"""Демо-данные для презентаций и тестирования.

Создаёт 1 организацию, 2 филиала, 3 отдела, 10 сотрудников, 2 устройства,
2 расписания и события прохода за 7 дней. Запускается только если
DEMO_SEED=true в .env и таблица employees пуста.
"""
import random
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crypto import encrypt
from app.db.session import SessionLocal
from app.models import (
    AttendanceEvent,
    Branch,
    Department,
    Device,
    Employee,
    Organization,
    Schedule,
    ScheduleAssignment,
    ScheduleDay,
)
from app.services import attendance as attendance_service


def seed_demo(db: Session) -> None:
    if db.scalar(select(Employee).limit(1)) is not None:
        return  # уже что-то есть

    # --- Организация
    org = Organization(
        name="ООО Демо-компания",
        inn="7700000001",
        address="г. Москва, ул. Демонстрационная, 1",
        phone="+7 (495) 000-00-00",
        email="info@demo.local",
        responsible_person="Иванов И.И.",
    )
    db.add(org)
    db.flush()

    # --- Филиалы
    branch_main = Branch(
        organization_id=org.id,
        name="Главный офис",
        address="г. Москва, ул. Демонстрационная, 1",
        responsible="Петров П.П.",
        working_hours="Пн–Пт 09:00–18:00",
    )
    branch_shop = Branch(
        organization_id=org.id,
        name="Магазин №1",
        address="г. Москва, пр. Торговый, 15",
        responsible="Сидорова А.А.",
        working_hours="Ежедневно 08:00–22:00",
    )
    db.add_all([branch_main, branch_shop])
    db.flush()

    # --- Отделы
    dep_it = Department(organization_id=org.id, name="IT-отдел")
    dep_acc = Department(organization_id=org.id, name="Бухгалтерия")
    dep_sales = Department(organization_id=org.id, name="Продажи")
    db.add_all([dep_it, dep_acc, dep_sales])
    db.flush()

    # --- Сотрудники (10)
    names = [
        ("Иванов", "Алексей", "Сергеевич", "IT-инженер", dep_it, branch_main),
        ("Петров", "Дмитрий", "Иванович", "DevOps", dep_it, branch_main),
        ("Сидоров", "Максим", "Андреевич", "Программист", dep_it, branch_main),
        ("Кузнецова", "Елена", "Викторовна", "Гл. бухгалтер", dep_acc, branch_main),
        ("Смирнова", "Ольга", "Александровна", "Бухгалтер", dep_acc, branch_main),
        ("Васильев", "Артём", "Николаевич", "Менеджер", dep_sales, branch_shop),
        ("Михайлова", "Анна", "Сергеевна", "Кассир", dep_sales, branch_shop),
        ("Новиков", "Игорь", "Петрович", "Менеджер", dep_sales, branch_shop),
        ("Фёдорова", "Мария", "Олеговна", "Кассир", dep_sales, branch_shop),
        ("Морозов", "Владимир", "Игоревич", "Охранник", None, branch_shop),
    ]
    employees: list[Employee] = []
    for i, (last, first, mid, pos, dep, br) in enumerate(names, start=1):
        emp = Employee(
            external_id=f"{i:04d}",
            first_name=first,
            last_name=last,
            middle_name=mid,
            phone=f"+7 (903) 100-00-{i:02d}",
            email=f"{last.lower()}@demo.local",
            organization_id=org.id,
            department_id=dep.id if dep else None,
            branch_id=br.id,
            position=pos,
            status="active",
            hired_at=date(2024, 1, 15),
        )
        db.add(emp)
        employees.append(emp)
    db.flush()

    # --- Устройства (mock)
    dev_main = Device(
        branch_id=branch_main.id,
        name="Главный вход (офис)",
        type="multi",
        ip="192.168.10.101",
        port=80,
        username="admin",
        password_encrypted=encrypt("demo-password"),
        serial_number="MOCK-OFFICE-01",
        firmware="V1.0.0_demo",
        online=True,
        last_seen_at=datetime.now(timezone.utc),
        purpose="main",
    )
    dev_shop = Device(
        branch_id=branch_shop.id,
        name="Служебный вход (магазин)",
        type="face",
        ip="192.168.10.102",
        port=80,
        username="admin",
        password_encrypted=encrypt("demo-password"),
        serial_number="MOCK-SHOP-01",
        firmware="V1.0.0_demo",
        online=True,
        last_seen_at=datetime.now(timezone.utc),
        purpose="entry",
    )
    db.add_all([dev_main, dev_shop])
    db.flush()

    # --- Расписания
    sch_office = Schedule(
        name="Офис Пн–Пт 09:00–18:00",
        type="office",
        allowed_late_minutes=10,
        allowed_early_leave_minutes=10,
        lunch_start=time(13, 0),
        lunch_end=time(14, 0),
    )
    for wd in range(7):
        sch_office.days.append(
            ScheduleDay(
                weekday=wd,
                is_workday=wd < 5,
                start_time=time(9, 0) if wd < 5 else None,
                end_time=time(18, 0) if wd < 5 else None,
            )
        )

    sch_shop = Schedule(
        name="Магазин 08:00–22:00",
        type="shop",
        allowed_late_minutes=15,
        allowed_early_leave_minutes=15,
    )
    for wd in range(7):
        sch_shop.days.append(
            ScheduleDay(
                weekday=wd,
                is_workday=True,
                start_time=time(8, 0),
                end_time=time(22, 0),
            )
        )

    db.add_all([sch_office, sch_shop])
    db.flush()

    # Назначения расписаний
    for emp in employees:
        target_sch = sch_office if emp.branch_id == branch_main.id else sch_shop
        db.add(
            ScheduleAssignment(
                schedule_id=target_sch.id,
                target_type="employee",
                target_id=emp.id,
            )
        )

    # --- События за последние 7 дней
    today = datetime.now(timezone.utc).date()
    rng = random.Random(42)
    for days_ago in range(7, 0, -1):
        day = today - timedelta(days=days_ago)
        if day.weekday() >= 5:
            # выходной — только магазин
            attending = [e for e in employees if e.branch_id == branch_shop.id]
        else:
            attending = list(employees)
        # 80% посещаемость
        for emp in attending:
            if rng.random() > 0.8:
                continue
            device = dev_main if emp.branch_id == branch_main.id else dev_shop
            base_start = time(9, 0) if emp.branch_id == branch_main.id else time(8, 0)
            base_end = time(18, 0) if emp.branch_id == branch_main.id else time(22, 0)
            # сдвиг прихода: чаще вовремя, иногда опоздание
            in_delta_minutes = rng.choice([-5, 0, 0, 0, 3, 8, 20, -2])
            out_delta_minutes = rng.choice([-3, 0, 0, 5, 12, -10])
            in_dt = datetime.combine(day, base_start, tzinfo=timezone.utc) + timedelta(
                minutes=in_delta_minutes
            )
            out_dt = datetime.combine(day, base_end, tzinfo=timezone.utc) + timedelta(
                minutes=out_delta_minutes
            )
            db.add_all([
                AttendanceEvent(
                    employee_id=emp.id,
                    device_id=device.id,
                    external_user_id=emp.external_id,
                    event_time=in_dt,
                    event_type="entry",
                    success=True,
                    raw_payload={"demo": True},
                ),
                AttendanceEvent(
                    employee_id=emp.id,
                    device_id=device.id,
                    external_user_id=emp.external_id,
                    event_time=out_dt,
                    event_type="exit",
                    success=True,
                    raw_payload={"demo": True},
                ),
            ])
    db.commit()

    # Пересчитать табель за 7 дней
    attendance_service.recalculate_range(db, today - timedelta(days=7), today)


def run() -> None:
    db = SessionLocal()
    try:
        seed_demo(db)
    finally:
        db.close()
