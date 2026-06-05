from app.core.rbac import ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLES, has_permission


def test_super_admin_has_everything():
    assert ROLE_PERMISSIONS["super_admin"] == ALL_PERMISSIONS


def test_viewer_has_only_reads():
    for perm in ROLE_PERMISSIONS["viewer"]:
        assert perm.endswith(".read"), f"viewer must not have {perm}"


def test_hr_cannot_touch_devices():
    assert not has_permission("hr", "devices.write")
    assert not has_permission("hr", "devices.sync")


def test_accountant_can_export_and_send():
    assert has_permission("accountant", "reports.export")
    assert has_permission("accountant", "integrations.send")
    assert not has_permission("accountant", "employees.write")


def test_branch_admin_can_manage_local():
    assert has_permission("branch_admin", "devices.write")
    assert has_permission("branch_admin", "employees.write")
    assert not has_permission("branch_admin", "users.write")


def test_all_roles_defined():
    expected = {"super_admin", "admin", "hr", "accountant", "manager", "viewer", "branch_admin"}
    assert set(ROLES) == expected
    assert set(ROLE_PERMISSIONS) == expected
