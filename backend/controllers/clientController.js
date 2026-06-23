// backend/controllers/clientController.js
const Client = require('../models/clientModel');
const pool = require('../config/database'); 

const clientController = {
    // Get all clients
    getAllClients: async (req, res) => {
        try {
            const filters = {
                search: req.query.search,
                industry: req.query.industry,
                status: req.query.status,
                assigned_manager: req.query.assigned_manager,
                location: req.query.location
            };

            const clients = await Client.getAll(req.tenantId, filters);
            res.json({ clients });
        } catch (error) {
            console.error('Get clients error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get client by ID
    getClient: async (req, res) => {
        try {
            const client = await Client.getById(req.tenantId, req.params.id);
            
            if (!client) {
                return res.status(404).json({ message: 'Client not found' });
            }

            // Get related data
            const [interactions, projects, documents] = await Promise.all([
                Client.getInteractions(req.tenantId, req.params.id),
                Client.getProjects(req.tenantId, req.params.id),
                Client.getDocuments(req.tenantId, req.params.id)
            ]);

            const clientWithDetails = {
                ...client,
                interactions,
                projects,
                documents,
                company_info: {
                    founded: client.founded_year,
                    employees: client.employees_count,
                    revenue: client.revenue,
                    website: client.website
                },
                communication_preferences: {
                    preferred_contact: client.preferred_contact,
                    follow_up_frequency: client.follow_up_frequency,
                    next_follow_up: client.next_follow_up
                }
            };

            res.json({ client: clientWithDetails });
        } catch (error) {
            console.error('Get client error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new client
    createClient: async (req, res) => {
        try {
            const {
                name, industry, contact_person, contact_email, contact_phone,
                location, assigned_manager, status, founded_year, employees_count,
                revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up
            } = req.body;

            // Validation
            if (!name || !contact_person || !contact_email) {
                return res.status(400).json({ message: 'Client name, contact person, and email are required' });
            }

            // Check if email already exists
            const emailExists = await Client.checkEmailExists(req.tenantId, contact_email);
            if (emailExists) {
                return res.status(400).json({ message: 'Client email already exists' });
            }

            const clientId = await Client.create(req.tenantId, {
                name,
                industry: industry || '',
                contact_person,
                contact_email,
                contact_phone: contact_phone || '',
                location: location || '',
                assigned_manager: assigned_manager || '',
                status: status || 'prospective',
                founded_year: founded_year || '',
                employees_count: employees_count || 0,
                revenue: revenue || '',
                website: website || '',
                notes: notes || '',
                preferred_contact: preferred_contact || 'email',
                follow_up_frequency: follow_up_frequency || 'weekly',
                next_follow_up: next_follow_up || null
            });

            res.status(201).json({ 
                message: 'Client created successfully', 
                client_id: clientId 
            });
        } catch (error) {
            console.error('Create client error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Update client
    updateClient: async (req, res) => {
        try {
            const {
                name, industry, contact_person, contact_email, contact_phone,
                location, assigned_manager, status, founded_year, employees_count,
                revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up
            } = req.body;
            const clientId = req.params.id;

            // Validation
            if (!name || !contact_person || !contact_email) {
                return res.status(400).json({ message: 'Client name, contact person, and email are required' });
            }

            // Check if client exists
            const existingClient = await Client.getById(req.tenantId, clientId);
            if (!existingClient) {
                return res.status(404).json({ message: 'Client not found' });
            }

            // Check if email already exists (excluding current client)
            const emailExists = await Client.checkEmailExists(req.tenantId, contact_email, clientId);
            if (emailExists) {
                return res.status(400).json({ message: 'Client email already exists' });
            }

            const affectedRows = await Client.update(req.tenantId, clientId, {
                name,
                industry: industry || '',
                contact_person,
                contact_email,
                contact_phone: contact_phone || '',
                location: location || '',
                assigned_manager: assigned_manager || '',
                status: status || 'prospective',
                founded_year: founded_year || '',
                employees_count: employees_count || 0,
                revenue: revenue || '',
                website: website || '',
                notes: notes || '',
                preferred_contact: preferred_contact || 'email',
                follow_up_frequency: follow_up_frequency || 'weekly',
                next_follow_up: next_follow_up || null
            });

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Client not found' });
            }

            res.json({ message: 'Client updated successfully' });
        } catch (error) {
            console.error('Update client error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete client
    deleteClient: async (req, res) => {
        try {
            const clientId = req.params.id;

            // Check if client exists
            const existingClient = await Client.getById(req.tenantId, clientId);
            if (!existingClient) {
                return res.status(404).json({ message: 'Client not found' });
            }

            const affectedRows = await Client.delete(req.tenantId, clientId);

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Client not found' });
            }

            res.json({ message: 'Client deleted successfully' });
        } catch (error) {
            console.error('Delete client error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Add interaction
    addInteraction: async (req, res) => {
        try {
            const { type, date, title, description, participants } = req.body;
            const clientId = req.params.id;

            // Validation
            if (!type || !date || !title) {
                return res.status(400).json({ message: 'Interaction type, date, and title are required' });
            }

            // Check if client exists
            const existingClient = await Client.getById(req.tenantId, clientId);
            if (!existingClient) {
                return res.status(404).json({ message: 'Client not found' });
            }

            const interactionId = await Client.addInteraction(req.tenantId, {
                client_id: clientId,
                type,
                date,
                title,
                description: description || '',
                participants: participants || []
            });

            res.status(201).json({ 
                message: 'Interaction added successfully', 
                interaction_id: interactionId 
            });
        } catch (error) {
            console.error('Add interaction error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get managers list
    getManagers: async (req, res) => {
        try {
            const managers = await Client.getManagers(req.tenantId);
            res.json({ managers });
        } catch (error) {
            console.error('Get managers error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get industries list - FIXED VERSION
    getIndustries: async (req, res) => {
        try {
            const [rows] = await pool.execute(
                'SELECT DISTINCT industry FROM clients WHERE industry IS NOT NULL AND industry != "" AND tenant_id = ? ORDER BY industry',
                [req.tenantId]
            );
            const industries = rows.map(row => row.industry);
            
            // Add default industries if none exist
            const defaultIndustries = ['Technology', 'Retail', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Other'];
            const allIndustries = [...new Set([...industries, ...defaultIndustries])].sort();
            
            res.json({ industries: allIndustries });
        } catch (error) {
            console.error('Get industries error:', error);
            // Return default industries if database query fails
            res.json({ industries: ['Technology', 'Retail', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Other'] });
        }
    },

    // Add new industry
    addIndustry: async (req, res) => {
        try {
            const { industry } = req.body;

            if (!industry || industry.trim() === '') {
                return res.status(400).json({ message: 'Industry name is required' });
            }

            const industryName = industry.trim();

            // Validate industry name
            if (industryName.length > 100) {
                return res.status(400).json({ message: 'Industry name is too long' });
            }

            // Add industry (this will just validate and return success since we don't have a separate table)
            await Client.addIndustry(req.tenantId, industryName);

            res.json({ 
                message: 'Industry added successfully',
                industry: industryName
            });
        } catch (error) {
            console.error('Add industry error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = clientController;