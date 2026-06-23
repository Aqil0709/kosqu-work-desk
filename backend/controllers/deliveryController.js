// backend/controllers/deliveryController.js
const DeliveryChallan = require('../models/deliveryModel');

const deliveryController = {
    // Get all delivery challans
    getAllChallans: async (req, res) => {
        try {
            const filters = {};
            
            if (req.query.month) filters.month = req.query.month;
            if (req.query.destination) filters.destination = req.query.destination;

            const challans = await DeliveryChallan.getAll(req.tenantId, filters);
            res.json({ challans });
        } catch (error) {
            console.error('Get delivery challans error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get challan by ID
    getChallan: async (req, res) => {
        try {
            const challan = await DeliveryChallan.getById(req.tenantId, req.params.id);
            
            if (!challan) {
                return res.status(404).json({ message: 'Delivery challan not found' });
            }

            res.json({ challan });
        } catch (error) {
            console.error('Get delivery challan error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new delivery challan
    createChallan: async (req, res) => {
        const connection = await DeliveryChallan.getConnection(req.tenantId);
        try {
            await connection.beginTransaction();

            const {
                challan_no,
                challan_date,
                destination,
                dispatched_through,
                to_address,
                from_address,
                contact_info,
                payment_info,
                items
            } = req.body;

            // Validation
            if (!challan_no || !challan_date || !destination || !to_address) {
                return res.status(400).json({ 
                    message: 'Challan number, date, destination, and to address are required' 
                });
            }

            // Check if challan number already exists
            const existingChallan = await DeliveryChallan.getByChallanNo(req.tenantId, challan_no);
            if (existingChallan) {
                return res.status(400).json({ message: 'Challan number already exists' });
            }

            const challanId = await DeliveryChallan.create(req.tenantId, {
                challan_no,
                challan_date,
                destination,
                dispatched_through: dispatched_through || 'By Hand',
                to_address,
                from_address: from_address || 'Above Being Healthy Gym, Near Surbhi Hospital, Nagar Sambhajinagar Road, Ahilyanagar [Ahmednagar] Maharashtra 414003',
                contact_info: contact_info || 'info@arhamitsolution.in\n9322195628',
                payment_info: payment_info || '100% against delivery',
                created_by: req.user.id
            });

            // Insert items
            for (const item of items) {
                await DeliveryChallan.createItem(req.tenantId, {
                    challan_id: challanId,
                    sr_no: item.sr_no,
                    description: item.description,
                    quantity: item.quantity
                });
            }

            // Insert initial history
            await DeliveryChallan.createHistory(req.tenantId, {
                challan_id: challanId,
                date: new Date().toISOString().split('T')[0],
                action: 'Delivery challan created',
                user: req.user.name || 'Admin',
                follow_up: 'Initial delivery challan setup completed'
            });

            await connection.commit();

            // Return the created challan
            const newChallan = await DeliveryChallan.getById(req.tenantId, challanId);
            res.status(201).json({ 
                message: 'Delivery challan created successfully', 
                challan: newChallan 
            });
        } catch (error) {
            await connection.rollback();
            console.error('Create delivery challan error:', error);
            res.status(500).json({ message: 'Server error' });
        } finally {
            connection.release();
        }
    },

    // Update delivery challan
    updateChallan: async (req, res) => {
        const connection = await DeliveryChallan.getConnection(req.tenantId);
        try {
            await connection.beginTransaction();

            const challanId = req.params.id;
            const {
                challan_no,
                challan_date,
                destination,
                dispatched_through,
                to_address,
                from_address,
                contact_info,
                payment_info,
                items
            } = req.body;

            // Check if challan exists
            const existingChallan = await DeliveryChallan.getById(req.tenantId, challanId);
            if (!existingChallan) {
                return res.status(404).json({ message: 'Delivery challan not found' });
            }

            // Update challan
            await DeliveryChallan.update(req.tenantId, challanId, {
                challan_no,
                challan_date,
                destination,
                dispatched_through,
                to_address,
                from_address,
                contact_info,
                payment_info
            });

            // Delete existing items
            await DeliveryChallan.deleteItems(req.tenantId, challanId);

            // Insert updated items
            for (const item of items) {
                await DeliveryChallan.createItem(req.tenantId, {
                    challan_id: challanId,
                    sr_no: item.sr_no,
                    description: item.description,
                    quantity: item.quantity
                });
            }

            // Add history entry
            await DeliveryChallan.createHistory(req.tenantId, {
                challan_id: challanId,
                date: new Date().toISOString().split('T')[0],
                action: 'Delivery challan updated',
                user: req.user.name || 'Admin',
                follow_up: 'Delivery challan details modified'
            });

            await connection.commit();

            const updatedChallan = await DeliveryChallan.getById(req.tenantId, challanId);
            res.json({ 
                message: 'Delivery challan updated successfully', 
                challan: updatedChallan 
            });
        } catch (error) {
            await connection.rollback();
            console.error('Update delivery challan error:', error);
            res.status(500).json({ message: 'Server error' });
        } finally {
            connection.release();
        }
    },

    // Delete delivery challan
    deleteChallan: async (req, res) => {
        try {
            const challanId = req.params.id;

            const affectedRows = await DeliveryChallan.delete(req.tenantId, challanId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Delivery challan not found' });
            }

            res.json({ message: 'Delivery challan deleted successfully' });
        } catch (error) {
            console.error('Delete delivery challan error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Add follow-up note
    addFollowUp: async (req, res) => {
        try {
            const { follow_up } = req.body;
            const challanId = req.params.id;

            if (!follow_up) {
                return res.status(400).json({ message: 'Follow-up note is required' });
            }

            await DeliveryChallan.createHistory(req.tenantId, {
                challan_id: challanId,
                date: new Date().toISOString().split('T')[0],
                action: 'Follow-up added',
                user: req.user.name || 'Admin',
                follow_up
            });

            res.json({ message: 'Follow-up added successfully' });
        } catch (error) {
            console.error('Add follow-up error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Download delivery challan PDF
    downloadChallanPDF: async (req, res) => {
        try {
            const challan = await DeliveryChallan.getById(req.tenantId, req.params.id);
            
            if (!challan) {
                return res.status(404).json({ message: 'Delivery challan not found' });
            }

            // Generate HTML for PDF using the delivery.html template
            const htmlContent = generateChallanHTML(challan);
            
            // For now, return HTML that can be converted to PDF on frontend
            res.json({ 
                html: htmlContent,
                challan_no: challan.challan_no
            });
            
        } catch (error) {
            console.error('Download delivery challan PDF error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};


module.exports = deliveryController;