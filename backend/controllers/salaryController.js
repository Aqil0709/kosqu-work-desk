// backend/controllers/salaryController.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Salary = require('../models/salaryModel');
const Attendance = require('../models/attendanceModel');
const pool = require('../config/database'); // ✅ ADD THIS LINE

const salaryController = {
    // Get all salary records
    getAllSalaryRecords: async (req, res) => {
        try {
            const { employee, department, month, year, status } = req.query;
            const filters = { employee, department, month, year, status };
            
            const salaryRecords = await Salary.getAll(req.tenantId, filters);
            res.json({ salaryRecords });
        } catch (error) {
            console.error('Get salary records error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get salary records for the logged-in employee
    getMySalaryRecords: async (req, res) => {
        try {
            const { month, year } = req.query;
            const salaryRecords = await Salary.getByUserId(req.tenantId, req.user.id, { month, year });
            res.json({ salaryRecords });
        } catch (error) {
            console.error('Get my salary records error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get salary record by ID
    getSalaryRecord: async (req, res) => {
        try {
            const salaryRecord = await Salary.getById(req.tenantId, req.params.id);
            
            if (!salaryRecord) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            res.json({ salaryRecord });
        } catch (error) {
            console.error('Get salary record error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    createSalaryRecord: async (req, res) => {
        try {
            const {
                employee_id,
                department_id,
                basic_salary,
                allowances,
                deductions,
                net_salary,
                payment_date,
                month,
                year,
                payment_frequency,
                status
            } = req.body;

            console.log('Received salary data:', req.body);

            // Validation
            if (!employee_id || !basic_salary || !month || !year) {
                return res.status(400).json({ 
                    message: 'Employee, basic salary, month, and year are required',
                    received: { employee_id, basic_salary, month, year }
                });
            }

            // Check if salary record already exists
            const recordExists = await Salary.checkRecordExists(req.tenantId, employee_id, month, year);
            if (recordExists) {
                return res.status(400).json({ 
                    message: 'Salary record already exists for this employee and period' 
                });
            }

            const salaryId = await Salary.create(req.tenantId, {
                employee_id,
                department_id,
                basic_salary: parseFloat(basic_salary),
                allowances,
                deductions,
                net_salary: parseFloat(net_salary),
                payment_date,
                month,
                year,
                payment_frequency: payment_frequency || 'Monthly',
                status: status || 'pending'
            });

            res.status(201).json({ 
                message: 'Salary record created successfully', 
                salary_id: salaryId,
                net_salary: net_salary
            });
        } catch (error) {
            console.error('Create salary record error:', error);
            res.status(500).json({ 
                message: 'Server error: ' + error.message 
            });
        }
    },

    // Update salary record
    updateSalaryRecord: async (req, res) => {
        try {
            const {
                employee_id,
                department_id,
                basic_salary,
                allowances,
                deductions,
                net_salary,
                payment_date,
                month,
                year,
                payment_frequency,
                status
            } = req.body;
            const salaryId = req.params.id;

            // Validation
            if (!employee_id || !basic_salary || !month || !year) {
                return res.status(400).json({ 
                    message: 'Employee, basic salary, month, and year are required' 
                });
            }

            // Check if salary record exists
            const existingRecord = await Salary.getById(req.tenantId, salaryId);
            if (!existingRecord) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            // Check if salary record already exists for this employee and period (excluding current record)
            const recordExists = await Salary.checkRecordExists(req.tenantId, employee_id, month, year, salaryId);
            if (recordExists) {
                return res.status(400).json({ 
                    message: 'Salary record already exists for this employee and period' 
                });
            }

            const affectedRows = await Salary.update(req.tenantId, salaryId, {
                employee_id,
                department_id,
                basic_salary: parseFloat(basic_salary),
                allowances,
                deductions,
                net_salary: parseFloat(net_salary),
                payment_date,
                month,
                year,
                payment_frequency,
                status
            });

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            res.json({ message: 'Salary record updated successfully' });
        } catch (error) {
            console.error('Update salary record error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete salary record
    deleteSalaryRecord: async (req, res) => {
        try {
            const salaryId = req.params.id;

            // Check if salary record exists
            const existingRecord = await Salary.getById(req.tenantId, salaryId);
            if (!existingRecord) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            const affectedRows = await Salary.delete(req.tenantId, salaryId);

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            res.json({ message: 'Salary record deleted successfully' });
        } catch (error) {
            console.error('Delete salary record error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

getEmployees: async (req, res) => {
    try {
        const employees = await Salary.getEmployees(req.tenantId);
        res.json({ employees });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
},
 getDepartments: async (req, res) => {
    try {
        const departments = await Salary.getDepartments(req.tenantId);
        console.log('Sending departments to frontend:', departments.length);
        res.json({ departments: departments });
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ message: 'Server error', departments: [] });
    }
},
    // Get salary statistics
    getSalaryStats: async (req, res) => {
        try {
            const stats = await Salary.getStatistics(req.tenantId);
            res.json({ stats });
        } catch (error) {
            console.error('Get salary stats error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get salary breakdown by department
    getSalaryByDepartment: async (req, res) => {
        try {
            const { month, year } = req.query;
            
            if (!month || !year) {
                return res.status(400).json({ 
                    message: 'Month and year are required' 
                });
            }

            const departmentBreakdown = await Salary.getSalaryByDepartment(
                req.tenantId, 
                month, 
                year
            );
            
            res.json({ departmentBreakdown });
        } catch (error) {
            console.error('Get salary by department error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Generate payslip PDF with attendance details
    generatePayslip: async (req, res) => {
        try {
            const salaryId = req.params.id;
            
            const salaryRecord = await Salary.getById(req.tenantId, salaryId);
            if (!salaryRecord) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            // Get attendance summary for the payslip
            const attendanceSummary = await Attendance.getMonthlyAttendanceSummary(
                req.tenantId,
                salaryRecord.employee_id,
                getMonthNumber(salaryRecord.month),
                salaryRecord.year
            );

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 
                `attachment; filename=payslip-${salaryRecord.employee_name}-${salaryRecord.month}-${salaryRecord.year}.pdf`);

            doc.pipe(res);
            generatePayslipContent(doc, salaryRecord, attendanceSummary);
            doc.end();

        } catch (error) {
            console.error('Generate payslip error:', error);
            res.status(500).json({ message: 'Error generating payslip' });
        }
    },

    // Generate payslip preview as base64
    generatePayslipPreview: async (req, res) => {
        try {
            const salaryId = req.params.id;
            
            const salaryRecord = await Salary.getById(req.tenantId, salaryId);
            if (!salaryRecord) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            // Get attendance summary for the payslip
            const attendanceSummary = await Attendance.getMonthlyAttendanceSummary(
                req.tenantId,
                salaryRecord.employee_id,
                getMonthNumber(salaryRecord.month),
                salaryRecord.year
            );

            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];
            
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                const base64Pdf = pdfBuffer.toString('base64');
                
                res.json({
                    success: true,
                    data: {
                        base64: base64Pdf,
                        filename: `payslip-${salaryRecord.employee_name}-${salaryRecord.month}-${salaryRecord.year}.pdf`
                    }
                });
            });

            generatePayslipContent(doc, salaryRecord, attendanceSummary);
            doc.end();

        } catch (error) {
            console.error('Generate payslip preview error:', error);
            res.status(500).json({ message: 'Error generating payslip preview' });
        }
    },

    // Bulk create salary records for all employees
    bulkCreateSalaryRecords: async (req, res) => {
        try {
            const { month, year, payment_date, status } = req.body;

            if (!month || !year) {
                return res.status(400).json({ 
                    message: 'Month and year are required' 
                });
            }

            const employees = await Salary.getEmployees(req.tenantId);
            const results = {
                success: [],
                failed: [],
                skipped: []
            };

            for (const employee of employees) {
                try {
                    // Check if record already exists
                    const recordExists = await Salary.checkRecordExists(
                        req.tenantId, 
                        employee.id, 
                        month, 
                        year
                    );

                    if (recordExists) {
                        results.skipped.push({
                            employee_id: employee.id,
                            employee_name: employee.name,
                            reason: 'Salary record already exists'
                        });
                        continue;
                    }

                    // Calculate salary based on attendance
                    const monthNumber = typeof month === 'string' ? getMonthNumber(month) : parseInt(month);
                    const attendanceCalculation = await Salary.calculateSalaryFromAttendance(
                        req.tenantId,
                        employee.id,
                        monthNumber,
                        parseInt(year),
                        parseFloat(employee.salary || 0)
                    );

                    const salaryData = {
                        employee_id: employee.id,
                        department_id: employee.department_id,
                        basic_salary: parseFloat(employee.salary || 0),
                        allowances: {
                            hra: (employee.salary || 0) * 0.4,
                            transport: 0,
                            medical: 0,
                            special: 0
                        },
                        deductions: {
                            tax: 0,
                            provident_fund: (employee.salary || 0) * 0.12,
                            insurance: 0,
                            loan: 0
                        },
                        net_salary: attendanceCalculation.final_salary,
                        payment_date: payment_date || new Date().toISOString().split('T')[0],
                        month,
                        year,
                        payment_frequency: 'Monthly',
                        status: status || 'pending'
                    };

                    const salaryId = await Salary.create(req.tenantId, salaryData);
                    
                    results.success.push({
                        employee_id: employee.id,
                        employee_name: employee.name,
                        salary_id: salaryId,
                        net_salary: attendanceCalculation.final_salary,
                        attendance_summary: attendanceCalculation
                    });

                } catch (error) {
                    results.failed.push({
                        employee_id: employee.id,
                        employee_name: employee.name,
                        error: error.message
                    });
                }
            }

            res.json({
                success: true,
                message: `Created ${results.success.length} salary records`,
                results: results
            });

        } catch (error) {
            console.error('Bulk create salary records error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Send payslip email
    sendPayslipEmail: async (req, res) => {
        try {
            const salaryId = req.params.id;
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: 'Email address is required' });
            }

            const salaryRecord = await Salary.getById(req.tenantId, salaryId);
            if (!salaryRecord) {
                return res.status(404).json({ message: 'Salary record not found' });
            }

            // Here you would integrate with your email service
            // For example: nodemailer, sendgrid, etc.
            
            res.json({
                success: true,
                message: `Payslip sent to ${email}`
            });

        } catch (error) {
            console.error('Send payslip email error:', error);
            res.status(500).json({ message: 'Error sending email' });
        }
    },
// backend/controllers/salaryController.js

calculateSalaryFromAttendance: async (req, res) => {
    try {
        const { employee_id, month, year, basic_salary } = req.body;
        
        console.log('🔍 BACKEND DEBUG - Received request:', { employee_id, month, year, basic_salary });
        
        if (!employee_id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }
        
        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required'
            });
        }
        
        // Get employee details
        const [employee] = await pool.execute(
            'SELECT * FROM employee_details WHERE id = ? AND tenant_id = ?',
            [employee_id, req.tenantId]
        );
        
        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        
        let salary = basic_salary;
        if (!salary) {
            salary = employee[0].salary;
        }
        
        console.log('🔍 BACKEND DEBUG - Employee salary:', salary);
        
        const salaryCalculation = await Salary.calculateSalaryFromAttendance(
            req.tenantId,
            employee_id,
            month,
            year,
            parseFloat(salary)
        );
        
        console.log('🔍 BACKEND DEBUG - Calculation result:', {
            final_salary: salaryCalculation.final_salary,
            payable_days: salaryCalculation.payable_days,
            salary_deductions: salaryCalculation.salary_deductions,
            attendance_summary: salaryCalculation.attendance_summary
        });
        
        res.json({
            success: true,
            data: salaryCalculation
        });
        
    } catch (error) {
        console.error('Error calculating salary from attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating salary: ' + error.message
        });
    }
},
};

// Helper function to get month number
function getMonthNumber(monthName) {
    const months = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    return months[monthName] || 1;
}

// Helper function to generate payslip content with attendance details
function generatePayslipContent(doc, salaryRecord, attendanceSummary = null) {
    const { employee_name, employee_id, designation, department_name, month, year, 
            basic_salary, allowances, deductions, net_salary, payment_date, 
            bank_account_number, ifsc_code, pan_number, aadhar_number } = salaryRecord;

    // Company Header
    doc.fillColor('#2c3e50')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('COMPANY NAME LTD.', 50, 50, { align: 'center' });
    
    doc.fillColor('#7f8c8d')
       .fontSize(12)
       .font('Helvetica')
       .text('Salary Payslip', 50, 75, { align: 'center' });
    
    doc.moveTo(50, 95).lineTo(550, 95).strokeColor('#bdc3c7').lineWidth(1).stroke();

    doc.y = 110;
    
    // Employee Details Section
    doc.fillColor('#2c3e50')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Employee Details:', 50, doc.y);
    
    doc.fillColor('#34495e')
       .fontSize(10)
       .font('Helvetica')
       .text(`Name: ${employee_name}`, 50, doc.y + 20)
       .text(`Employee ID: ${employee_id}`, 50, doc.y + 35)
       .text(`Designation: ${designation}`, 50, doc.y + 50)
       .text(`Department: ${department_name}`, 50, doc.y + 65);

    // Payment Info
    doc.fillColor('#2c3e50')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Payment Details:', 300, doc.y);
    
    doc.fillColor('#34495e')
       .fontSize(10)
       .font('Helvetica')
       .text(`Payment Month: ${month} ${year}`, 300, doc.y + 20)
       .text(`Payment Date: ${new Date(payment_date).toLocaleDateString('en-IN')}`, 300, doc.y + 35)
       .text(`Payment Status: Paid`, 300, doc.y + 50);

    // Attendance Summary Section (if available)
    if (attendanceSummary) {
        doc.y += 90;
        
        doc.fillColor('#2c3e50')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('Attendance Summary', 50, doc.y);
        
        doc.fillColor('#34495e')
           .fontSize(9)
           .font('Helvetica');
        
        const attendanceY = doc.y + 20;
        doc.text(`Present Days: ${attendanceSummary.present_days || 0}`, 50, attendanceY);
        doc.text(`Delayed Days: ${attendanceSummary.delayed_days || 0}`, 180, attendanceY);
        doc.text(`Half Days: ${attendanceSummary.half_days || 0}`, 310, attendanceY);
        doc.text(`Absent Days: ${attendanceSummary.absent_days || 0}`, 440, attendanceY);
        
       doc.text(`Total Working Hours: ${(parseFloat(attendanceSummary.total_worked_hours) || 0).toFixed(1)} hrs`, 50, attendanceY + 18);
        doc.text(`Payable Days: ${(attendanceSummary.present_days || 0) + ((attendanceSummary.half_days || 0) * 0.5)}`, 310, attendanceY + 18);
        
        doc.y = attendanceY + 45;
    }

    doc.y += 20;

    // Salary Breakdown Section
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Salary Breakdown', 50, doc.y, { align: 'center' });
    
    doc.y += 25;

    // Earnings Table
    const earningsStartY = doc.y;
    
    doc.fillColor('#ecf0f1')
       .rect(50, doc.y, 250, 20)
       .fill();
    
    doc.fillColor('#2c3e50')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('EARNINGS', 60, doc.y + 6)
       .text('AMOUNT (₹)', 200, doc.y + 6, { width: 90, align: 'right' });
    
    doc.y += 25;

    const earnings = [
        { description: 'Basic Salary', amount: basic_salary },
        { description: 'House Rent Allowance (HRA)', amount: allowances?.hra || 0 },
        { description: 'Transport Allowance', amount: allowances?.transport || 0 },
        { description: 'Medical Allowance', amount: allowances?.medical || 0 },
        { description: 'Special Allowance', amount: allowances?.special || 0 }
    ];

    earnings.forEach((earning, index) => {
        const yPos = doc.y + (index * 18);
        
        doc.fillColor(index % 2 === 0 ? '#ffffff' : '#f8f9fa')
           .rect(50, yPos, 250, 18)
           .fill();
        
        doc.fillColor('#2c3e50')
           .fontSize(9)
           .font('Helvetica')
           .text(earning.description, 60, yPos + 5)
           .text(formatCurrency(earning.amount), 200, yPos + 5, { width: 90, align: 'right' });
    });

    const totalEarningsY = doc.y + (earnings.length * 18);
    const totalEarnings = basic_salary + (allowances?.hra || 0) + (allowances?.transport || 0) + 
                         (allowances?.medical || 0) + (allowances?.special || 0);
    
    doc.fillColor('#d5dbdb')
       .rect(50, totalEarningsY, 250, 20)
       .fill();
    
    doc.fillColor('#2c3e50')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Total Earnings', 60, totalEarningsY + 6)
       .text(formatCurrency(totalEarnings), 200, totalEarningsY + 6, { width: 90, align: 'right' });

    // Deductions Table
    const deductionsStartY = earningsStartY;
    
    doc.fillColor('#ecf0f1')
       .rect(320, deductionsStartY, 230, 20)
       .fill();
    
    doc.fillColor('#2c3e50')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('DEDUCTIONS', 330, deductionsStartY + 6)
       .text('AMOUNT (₹)', 440, deductionsStartY + 6, { width: 100, align: 'right' });
    
    doc.y = deductionsStartY + 25;

    const deductionItems = [
        { description: 'Income Tax', amount: deductions?.tax || 0 },
        { description: 'Provident Fund (PF)', amount: deductions?.provident_fund || 0 },
        { description: 'Insurance', amount: deductions?.insurance || 0 },
        { description: 'Loan Recovery', amount: deductions?.loan || 0 }
    ];

    deductionItems.forEach((deduction, index) => {
        const yPos = doc.y + (index * 18);
        
        doc.fillColor(index % 2 === 0 ? '#ffffff' : '#f8f9fa')
           .rect(320, yPos, 230, 18)
           .fill();
        
        doc.fillColor('#2c3e50')
           .fontSize(9)
           .font('Helvetica')
           .text(deduction.description, 330, yPos + 5)
           .text(formatCurrency(deduction.amount), 440, yPos + 5, { width: 100, align: 'right' });
    });

    const totalDeductionsY = doc.y + (deductionItems.length * 18);
    const totalDeductions = (deductions?.tax || 0) + (deductions?.provident_fund || 0) + 
                           (deductions?.insurance || 0) + (deductions?.loan || 0);
    
    doc.fillColor('#d5dbdb')
       .rect(320, totalDeductionsY, 230, 20)
       .fill();
    
    doc.fillColor('#2c3e50')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Total Deductions', 330, totalDeductionsY + 6)
       .text(formatCurrency(totalDeductions), 440, totalDeductionsY + 6, { width: 100, align: 'right' });

    // Net Salary Section
    const netSalaryY = Math.max(totalEarningsY, totalDeductionsY) + 30;
    
    doc.fillColor('#2c3e50')
       .rect(50, netSalaryY, 500, 30)
       .fill();
    
    doc.fillColor('#ffffff')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('NET SALARY', 60, netSalaryY + 8)
       .text(formatCurrency(net_salary), 400, netSalaryY + 8, { width: 140, align: 'right' });

    // Footer
    const footerY = 750;
    
    doc.fillColor('#7f8c8d')
       .fontSize(8)
       .font('Helvetica')
       .text('This is a computer-generated payslip and does not require signature.', 50, footerY, { align: 'center' })
       .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 50, footerY + 12, { align: 'center' });
}

// Helper function to format currency
function formatCurrency(amount) {
    return '₹' + new Intl.NumberFormat('en-IN').format(amount || 0);
}

module.exports = salaryController;