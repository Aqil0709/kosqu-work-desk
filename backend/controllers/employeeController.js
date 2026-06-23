const FaceRecognition = require('../utils/faceRecognition');
const Employee = require('../models/employeeModel');
const pool = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendEmployeeCredentials } = require('../utils/emailService');

const employeeController = {
    // Get roles for this tenant
    getRoles: async (req, res) => {
        try {
            const [roles] = await pool.execute(
                'SELECT id, name, description FROM roles WHERE tenant_id = ? ORDER BY id',
                [req.tenantId]
            );
            res.json({ roles });
        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get current logged-in employee profile
    getMyProfile: async (req, res) => {
        try {
            const employee = await Employee.getByUserId(req.tenantId, req.user.id);
            if (!employee) {
                return res.status(404).json({ message: 'Employee profile not found' });
            }
            res.json({ employee });
        } catch (error) {
            console.error('Get my profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

// Get all employees
getAllEmployees: async (req, res) => {
    try {
        const filters = {};
        if (req.query.department_id) filters.department_id = req.query.department_id;
        if (req.query.is_active !== undefined) {
            filters.is_active = req.query.is_active === 'true';
        }
        if (req.query.role_id) filters.role_id = req.query.role_id;

        console.log('Backend filters received:', req.query);
        console.log('Processed filters:', filters);

        let employees = await Employee.getAll(req.tenantId, filters);
        console.log(`Found ${employees.length} employees before department filter`);
        
        // Detect whether many-to-many department mapping table exists.
        // Production may still be on a schema that only has employee_details.department_id.
        let hasEmployeeDepartmentsTable = true;
        try {
            await pool.execute('SELECT 1 FROM employee_departments LIMIT 1');
        } catch (tableError) {
            if (tableError.code === 'ER_NO_SUCH_TABLE') {
                hasEmployeeDepartmentsTable = false;
                console.warn('employee_departments table not found; using single department fallback.');
            } else {
                throw tableError;
            }
        }

        // Fetch departments for each employee and apply department filter
        const filteredEmployees = [];
        
        for (let employee of employees) {
            if (hasEmployeeDepartmentsTable) {
                // Get departments for this employee from mapping table
                const [deptRows] = await pool.execute(
                    `SELECT d.id, d.name 
                     FROM departments d 
                     INNER JOIN employee_departments ed ON d.id = ed.department_id 
                     WHERE ed.employee_id = ? AND d.tenant_id = ?`,
                    [employee.employee_id, req.tenantId]
                );

                employee.department_ids = deptRows.map(d => d.id);
                employee.department_names = deptRows.map(d => d.name);

                // Keep backward compatibility
                if (deptRows.length > 0) {
                    employee.department_id = deptRows[0].id;
                    employee.department_name = deptRows[0].name;
                }
            } else {
                // Fallback to single-department schema
                employee.department_ids = employee.department_id ? [employee.department_id] : [];
                employee.department_names = employee.department_name ? [employee.department_name] : [];
            }
            
            // Apply department filter if present
            if (filters.department_id) {
                // Check if employee belongs to the filtered department
                const filterDepartmentId = parseInt(filters.department_id, 10);
                const belongsToDepartment = employee.department_ids.includes(filterDepartmentId);
                if (belongsToDepartment) {
                    filteredEmployees.push(employee);
                }
            } else {
                filteredEmployees.push(employee);
            }
        }
        
        const finalEmployees = filters.department_id ? filteredEmployees : employees;
        console.log(`Found ${finalEmployees.length} employees after department filter`);
        
        res.json({ employees: finalEmployees });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
},

// Update getEmployee function
getEmployee: async (req, res) => {
    try {
        const employee = await Employee.getById(req.tenantId, req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        
        // Fetch departments from mapping table when available; otherwise fallback.
        try {
            const [deptRows] = await pool.execute(
                `SELECT d.id, d.name 
                 FROM departments d 
                 INNER JOIN employee_departments ed ON d.id = ed.department_id 
                 WHERE ed.employee_id = ? AND d.tenant_id = ?`,
                [req.params.id, req.tenantId]
            );

            employee.department_ids = deptRows.map(d => d.id);
            employee.department_names = deptRows.map(d => d.name);
        } catch (tableError) {
            if (tableError.code === 'ER_NO_SUCH_TABLE') {
                employee.department_ids = employee.department_id ? [employee.department_id] : [];
                employee.department_names = employee.department_name ? [employee.department_name] : [];
            } else {
                throw tableError;
            }
        }
        
        res.json({ employee });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
},

// Update createEmployee function
createEmployee: async (req, res) => {
    try {
        const {
            first_name, last_name, email, phone, department_ids, position,
            joining_date, date_of_birth, address, emergency_contact,
            bank_account_number, ifsc_code, pan_number, aadhar_number,
            employee_id, role_id, salary
        } = req.body;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({ message: 'First name, last name, and email are required' });
        }

        if (employee_id) {
            const exists = await Employee.checkEmployeeIdExists(req.tenantId, employee_id);
            if (exists) {
                return res.status(400).json({ message: 'Employee ID already exists' });
            }
        }

        const rawPassword = crypto.randomBytes(4).toString('hex');
        const password_hash = await bcrypt.hash(rawPassword, 10);

        // Use first department as primary for backward compatibility
        const primary_department_id = (department_ids && department_ids.length > 0) ? department_ids[0] : null;

        const employeeData = {
            first_name, last_name, email, password_hash,
            phone: phone || null, department_id: primary_department_id, position: position || null,
            salary: salary || null,
            joining_date: joining_date || null, date_of_birth: date_of_birth || null,
            address: address || null, emergency_contact: emergency_contact || null,
            bank_account_number: bank_account_number || null, ifsc_code: ifsc_code || null,
            pan_number: pan_number || null, aadhar_number: aadhar_number || null,
            employee_id: employee_id || null, role_id: role_id || null
        };

        const result = await Employee.create(req.tenantId, employeeData);
        
        // Handle multiple departments
        if (department_ids && department_ids.length > 0) {
            for (const deptId of department_ids) {
                await pool.execute(
                    'INSERT INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?, ?, ?)',
                    [result.employee_id, deptId, req.tenantId]
                );
            }
        }

        const [tenantRows] = await pool.execute('SELECT slug FROM tenants WHERE id = ?', [req.tenantId]);
        const tenantSlug = tenantRows[0]?.slug || 'Organization';
        const adminEmail = req.user?.email || process.env.SMTP_USER;

        if (adminEmail) {
            await sendEmployeeCredentials(adminEmail, tenantSlug, email, rawPassword, `${first_name} ${last_name}`);
        }

        res.status(201).json({ 
            message: 'Employee created successfully! Their login credentials have been emailed to you.', 
            user_id: result.user_id,
            employee_id: result.employee_id
        });

    } catch (error) {
        console.error('Create employee error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        if (error.message.includes('Employee ID already exists')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
},

// Update updateEmployee function
updateEmployee: async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name, last_name, email, phone, is_active, department_ids, position,
            joining_date, date_of_birth, address, emergency_contact,
            bank_account_number, ifsc_code, pan_number, aadhar_number, role_id, employee_id, salary
        } = req.body;

        const existingEmployee = await Employee.getById(req.tenantId, id);
        if (!existingEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Use first department as primary for backward compatibility
        const primary_department_id = (department_ids && department_ids.length > 0) ? department_ids[0] : null;

        const employeeData = {
            first_name, last_name, email, 
            employee_id: employee_id || existingEmployee.employee_id,
            phone: phone || null, is_active: is_active !== undefined ? is_active : true,
            department_id: primary_department_id, position: position || null,
            salary: salary || null,
            joining_date: joining_date || null, date_of_birth: date_of_birth || null,
            address: address || null, emergency_contact: emergency_contact || null,
            bank_account_number: bank_account_number || null, ifsc_code: ifsc_code || null,
            pan_number: pan_number || null, aadhar_number: aadhar_number || null,
            role_id: role_id || '3'
        };

        await Employee.update(req.tenantId, id, employeeData);
        
        // Update multiple departments
        if (department_ids !== undefined) {
            // Delete existing associations
            await pool.execute(
                'DELETE FROM employee_departments WHERE employee_id = ? AND tenant_id = ?',
                [id, req.tenantId]
            );
            
            // Insert new associations
            if (department_ids && department_ids.length > 0) {
                for (const deptId of department_ids) {
                    await pool.execute(
                        'INSERT INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?, ?, ?)',
                        [id, deptId, req.tenantId]
                    );
                }
            }
        }
        
        res.json({ message: 'Employee updated successfully' });

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
},

// Update deleteEmployee function to clean up department associations
deleteEmployee: async (req, res) => {
    try {
        const { id } = req.params;
        const existingEmployee = await Employee.getById(req.tenantId, id);
        if (!existingEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Delete department associations first
        await pool.execute(
            'DELETE FROM employee_departments WHERE employee_id = ? AND tenant_id = ?',
            [id, req.tenantId]
        );

        await Employee.delete(req.tenantId, id);
        res.json({ message: 'Employee deleted successfully' });

    } catch (error) {
        console.error('Delete employee error:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                message: 'Cannot delete this employee because they have associated records (attendance, tasks, etc.). Please edit and change their status to INACTIVE instead.' 
            });
        }
        res.status(500).json({ message: 'Server error' });
    }
},

  

    // Reset employee password
    resetPassword: async (req, res) => {
        try {
            const { id } = req.params;
            const { new_password } = req.body;

            if (!new_password) {
                return res.status(400).json({ message: 'New password is required' });
            }

            const existingEmployee = await Employee.getById(req.tenantId, id);
            if (!existingEmployee) {
                return res.status(404).json({ message: 'Employee not found' });
            }

            const password_hash = await bcrypt.hash(new_password, 10);
            
            await pool.execute(
                'UPDATE users SET password_hash = ? WHERE id = ? AND tenant_id = ?',
                [password_hash, existingEmployee.user_id, req.tenantId]
            );

            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },


    // Get departments
    getDepartments: async (req, res) => {
        try {
            const departments = await Employee.getDepartments(req.tenantId);
            res.json({ departments });
        } catch (error) {
            console.error('Get departments error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get suggested positions
    getSuggestedPositions: async (req, res) => {
        try {
            const positions = await Employee.getSuggestedPositions(req.tenantId);
            res.json({ positions });
        } catch (error) {
            console.error('Get suggested positions error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Add new suggested position
    addSuggestedPosition: async (req, res) => {
        try {
            const { name, category, description } = req.body;
            if (!name) {
                return res.status(400).json({ message: 'Position name is required' });
            }

            const positionId = await Employee.addSuggestedPosition(req.tenantId, {
                name, category: category || 'Other', description: description || null
            });

            res.status(201).json({ message: 'Position added successfully', position_id: positionId });
        } catch (error) {
            console.error('Add suggested position error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Position already exists' });
            }
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Enroll face for employee
    enrollFace: async (req, res) => {
        try {
            const { id } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ success: false, message: 'Face image is required' });
            }

            const faceEncoding = await FaceRecognition.extractFaceEncoding(file.buffer);
            if (!faceEncoding) {
                return res.status(400).json({ success: false, message: 'No face detected in the image.' });
            }

            const faceData = {
                enrolled: true, employeeId: id, timestamp: new Date().toISOString(),
                encoding: faceEncoding, encodingVersion: '1.0'
            };

            await Employee.updateFaceEncoding(req.tenantId, id, JSON.stringify(faceData));

            res.json({ success: true, message: 'Face enrolled successfully!', employeeId: id });
        } catch (error) {
            console.error('❌ Enroll face error:', error);
            res.status(500).json({ success: false, message: 'Server error: ' + error.message });
        }
    },

    getFaceStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const employee = await Employee.getById(req.tenantId, id);
            if (!employee) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }

            const hasFaceEnrolled = !!employee.face_encoding;
            res.json({
                success: true, hasFaceEnrolled,
                enrolledAt: hasFaceEnrolled ? JSON.parse(employee.face_encoding).timestamp : null
            });
        } catch (error) {
            console.error('Get face status error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    validateFace: async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'Image is required' });
            }

            const faceEncoding = await FaceRecognition.extractFaceEncoding(file.buffer);
            res.json({
                success: !!faceEncoding, faceDetected: !!faceEncoding,
                message: faceEncoding ? 'Face detected successfully' : 'No face detected'
            });
        } catch (error) {
            console.error('Validate face error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Verify face for attendance
    verifyFace: async (req, res) => {
        try {
            const { employeeId } = req.body;
            const file = req.file;

            if (!file || !employeeId) {
                return res.status(400).json({ success: false, message: 'Face image and employee ID are required' });
            }

            const employee = await Employee.getById(req.tenantId, employeeId);
            if (!employee) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }

            if (!employee.face_encoding) {
                return res.status(400).json({ success: false, message: 'No face enrolled for this employee' });
            }

            const currentFaceEncoding = await FaceRecognition.extractFaceEncoding(file.buffer);
            if (!currentFaceEncoding) {
                return res.json({ success: false, isMatch: false, message: 'No face detected in the image' });
            }

            const storedData = JSON.parse(employee.face_encoding);
            const isMatch = FaceRecognition.compareFaces(storedData.encoding, currentFaceEncoding);

            res.json({
                success: true, isMatch, confidence: isMatch ? 'High' : 'Low',
                message: isMatch ? 'Face verification successful!' : 'Face does not match!',
                employee: { id: employee.employee_id, name: `${employee.first_name} ${employee.last_name}` }
            });
        } catch (error) {
            console.error('❌ Verify face error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = employeeController;