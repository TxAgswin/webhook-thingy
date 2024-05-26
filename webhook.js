const axios = require('axios');

export default async function handler(req, res) {
  console.log('Received event:', req.body); // Log the received event

  if (req.method === 'POST') {
    const event = req.body;

    switch (event.type) {
      case 'invoice.payment_succeeded':
        const subscription = event.data.object;
        await updateAirtable(subscription.customer, 'premium');
        break;
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        await updateAirtable(updatedSubscription.customer, 'updated-status');
        break;
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await updateAirtable(deletedSubscription.customer, 'cancelled');
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

const updateAirtable = async (customerId, status) => {
  const airtablePat = process.env.AIRTABLE_PAT; // Updated to use AIRTABLE_PAT
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const tableName = 'Users';

  console.log('Updating Airtable:', { customerId, status }); // Log the update details

  const records = await axios.get(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}`, {
    headers: { Authorization: `Bearer ${airtablePat}` },
    params: { filterByFormula: `{StripeCustomerId} = '${customerId}'` }
  });

  if (records.data.records.length > 0) {
    const userRecordId = records.data.records[0].id;

    await axios.patch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${userRecordId}`, {
      fields: {
        Status: status
      }
    }, {
      headers: { Authorization: `Bearer ${airtablePat}` }
    });

    console.log('Airtable update successful');
  } else {
    console.log('No matching record found in Airtable');
  }
};

