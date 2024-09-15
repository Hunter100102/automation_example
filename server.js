const express = require('express');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit'); // Added to generate PDFs
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Enable CORS for all origins (replace * with your GitHub Pages URL if needed)
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// **Existing Route**: Handle email sending
app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    const msg = {
        to: 'william@automatingsolutions.com', // Your email address
        from: 'spc.cody.hunter@gmail.com', // Your verified sender email address
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    sgMail.send(msg)
        .then(() => {
            res.status(200).json({ message: 'Email sent successfully' });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ message: 'Failed to send email' });
        });
});

// **New Route**: Serve automations.html when the user navigates to /automations
app.get('/automations', (req, res) => {
    res.sendFile(path.join(__dirname, 'automations.html'));
});

// **Updated Route**: Handle invoice generation
app.post('/api/generate-invoice', (req, res) => {
    try {
        let { customerName, customerEmail, itemDescription, itemQuantity, itemPrice } = req.body;

        console.log('Received data:', req.body);

        // Ensure that itemDescription, itemQuantity, and itemPrice are arrays
        if (!Array.isArray(itemDescription)) {
            itemDescription = [itemDescription];
            itemQuantity = [itemQuantity];
            itemPrice = [itemPrice];
        }

        // Create a new PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');

        // Pipe the PDF document to the response
        doc.pipe(res);

        // Generate the invoice content
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Customer Name: ${customerName}`);
        doc.text(`Customer Email: ${customerEmail}`);
        doc.moveDown();

        doc.text('Order Details:');
        doc.moveDown();

        let totalAmount = 0;

        for (let i = 0; i < itemDescription.length; i++) {
            const description = itemDescription[i];
            const quantity = parseInt(itemQuantity[i], 10);
            const price = parseFloat(itemPrice[i]);

            // Check for NaN
            if (isNaN(quantity) || isNaN(price)) {
                throw new Error(`Invalid quantity or price at item ${i + 1}`);
            }

            const amount = quantity * price;
            totalAmount += amount;

            doc.text(`Item: ${description}`);
            doc.text(`Quantity: ${quantity}`);
            doc.text(`Price: $${price.toFixed(2)}`);
            doc.text(`Amount: $${amount.toFixed(2)}`);
            doc.moveDown();
        }

        doc.text(`Total Amount Due: $${totalAmount.toFixed(2)}`, { align: 'right' });

        // Finalize the PDF and end the document
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'An error occurred while generating the invoice.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
