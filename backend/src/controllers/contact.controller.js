const mongoose = require('mongoose');
const ContactMessage = require('../models/ContactMessage');

const VALID_SUBJECTS = [
  'Place a Custom Order',
  'Order Inquiry',
  'Delivery Query',
  'Feedback',
  'Other'
];

// @desc    Submit a contact inquiry
// @route   POST /api/contact
// @access  Public
const submitContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Check required presence
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Type checks
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof subject !== 'string' ||
      typeof message !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input types'
      });
    }

    const cleanName = name.trim();
    if (cleanName.length < 1 || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 1 and 100 characters'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (cleanEmail.length > 120 || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    let cleanPhone = '';
    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
      cleanPhone = phone.trim();
      if (cleanPhone.length > 0) {
        if (cleanPhone.length < 8 || cleanPhone.length > 15 || !/^[0-9+\-\s()]+$/.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid phone number format'
          });
        }
      }
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject'
      });
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters'
      });
    }
    if (cleanMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters'
      });
    }

    // Explicitly construct payload to prevent mass-assignment
    const inquiry = await ContactMessage.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject,
      message: cleanMessage,
      status: 'unread'
    });

    return res.status(201).json({
      success: true,
      message: "Thank you! Your message has been received. We'll get back to you soon.",
      data: {
        id: inquiry._id,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt
      }
    });
  } catch (error) {
    console.error(`Error saving contact message: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing your inquiry'
    });
  }
};

// @desc    Get contact inquiries
// @route   GET /api/admin/contact-messages
// @access  Private/Admin
const getContactMessages = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      if (!['unread', 'read', 'archived'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter'
        });
      }
      filter.status = status;
    }

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(messages);
  } catch (error) {
    console.error(`Error fetching contact messages: ${error.message}`);
    next(error);
  }
};

// @desc    Update contact inquiry status
// @route   PATCH /api/admin/contact-messages/:id
// @access  Private/Admin
const updateContactMessageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact message ID'
      });
    }

    if (!status || !['read', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either read or archived'
      });
    }

    const inquiry = await ContactMessage.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    inquiry.status = status;
    await inquiry.save();

    return res.status(200).json({
      success: true,
      message: `Inquiry status updated to ${status}`,
      data: inquiry
    });
  } catch (error) {
    console.error(`Error updating contact message status: ${error.message}`);
    next(error);
  }
};

module.exports = {
  submitContactMessage,
  getContactMessages,
  updateContactMessageStatus
};
