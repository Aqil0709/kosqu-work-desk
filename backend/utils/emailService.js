const nodemailer = require('nodemailer');
const Tenant = require('../models/tenantModel');

const getTransporter = async (tenantId) => {
    try {
        let options = {
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || '',
            }
        };

        if (tenantId) {
            // Find tenant and verify they have SMTP configured
            let tenant = null;
            if (typeof tenantId === 'string' && isNaN(Number(tenantId))) {
                 tenant = await Tenant.getBySlug(tenantId);
            } else {
                 tenant = await Tenant.getById(tenantId);
            }
            
            if (tenant && tenant.smtp_provider && tenant.smtp_user && tenant.smtp_password) {
                options = {
                    service: tenant.smtp_provider === 'outlook' ? 'hotmail' : 'gmail', // Hotmail/Outlook logic
                    auth: {
                        user: tenant.smtp_user,
                        pass: tenant.smtp_password
                    }
                };
            }
        }
        
        return {
            transporter: nodemailer.createTransport(options),
            fromEmail: options.auth.user
        };
    } catch (error) {
        console.error("Error creating custom transporter:", error);
        return {
            transporter: nodemailer.createTransport({
                 service: 'gmail',
                 auth: {
                     user: process.env.SMTP_USER,
                     pass: process.env.SMTP_PASS,
                 }
            }),
            fromEmail: process.env.SMTP_USER
        };
    }
};

const sendEmployeeCredentials = async (adminHrEmail, organizationId, employeeEmail, rawPassword, employeeName) => {
    try {
        const { transporter, fromEmail } = await getTransporter(organizationId);

        const mailOptions = {
            from: fromEmail,
            to: adminHrEmail,
            subject: `New Employee Credentials for ${employeeName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>New Employee Credentials Generated</h2>
                    <p>Hello,</p>
                    <p>A new employee record has been created successfully. Here are their login details. Please distribute these securely to the employee.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Organization ID:</strong> ${organizationId}</p>
                        <p><strong>Employee Login Email:</strong> ${employeeEmail}</p>
                        <p><strong>Temporary Password:</strong> ${rawPassword}</p>
                    </div>
                    <p>They can log in to the system using these credentials.</p>
                    <br>
                    <p>Best regards,<br>The System Admin</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Credentials emailed successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending employee credentials email:', error);
        return false;
    }
};

const sendPasswordResetEmail = async (userEmail, userName, resetLink, tenantId = null) => {
    try {
        const { transporter, fromEmail } = await getTransporter(tenantId);

        const mailOptions = {
            from: fromEmail,
            to: userEmail,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Password Reset Request</h2>
                    <p>Hello ${userName},</p>
                    <p>We received a request to reset your password. Please click the button below to choose a new password. This link will expire in 1 hour.</p>
                    <div style="margin: 20px 0;">
                        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    </div>
                    <p>If you did not request this, please safely ignore this email.</p>
                    <br>
                    <p>Best regards,<br>The System Admin</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent safely:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};

module.exports = {
    sendEmployeeCredentials,
    sendPasswordResetEmail
};
