import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { collectionName } from '@crm-atlas/utils';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

interface Product {
  tenant_id: string;
  unit_id: string;
  name: string;
  brand: string;
  model: string;
  year?: number;
  vehicle_type?: string;
  price: number;
  km?: number;
  color?: string;
  fuel_type?: string;
  vin?: string;
  license_plate?: string;
  description?: string;
  ownership: {
    owner_unit: string;
    visible_to: string[];
  };
  visible_to: string[];
  created_at: Date;
  updated_at: Date;
}

const products: Omit<
  Product,
  'tenant_id' | 'unit_id' | 'ownership' | 'visible_to' | 'created_at' | 'updated_at'
>[] = [
  // BMW
  {
    name: 'BMW Serie 3 320d',
    brand: 'bmw',
    model: 'Serie 3',
    year: 2023,
    vehicle_type: 'nuova',
    price: 45000,
    fuel_type: 'diesel',
    color: 'Nero',
    description: 'BMW Serie 3 320d, 190 CV, cambio automatico, full optional',
  },
  {
    name: 'BMW X5 xDrive30d',
    brand: 'bmw',
    model: 'X5',
    year: 2022,
    vehicle_type: 'usata',
    price: 65000,
    km: 25000,
    fuel_type: 'diesel',
    color: 'Bianco',
    description: 'BMW X5 xDrive30d, SUV di lusso, 265 CV, 25.000 km',
  },
  {
    name: 'BMW i4 eDrive40',
    brand: 'bmw',
    model: 'i4',
    year: 2024,
    vehicle_type: 'nuova',
    price: 55000,
    fuel_type: 'elettrica',
    color: 'Blu',
    description: 'BMW i4 eDrive40, elettrica, 340 CV, autonomia 590 km',
  },
  // Mercedes-Benz
  {
    name: 'Mercedes-Benz Classe C 220d',
    brand: 'mercedes',
    model: 'Classe C',
    year: 2023,
    vehicle_type: 'nuova',
    price: 48000,
    fuel_type: 'diesel',
    color: 'Argento',
    description: 'Mercedes-Benz Classe C 220d, 200 CV, cambio automatico',
  },
  {
    name: 'Mercedes-Benz GLC 300',
    brand: 'mercedes',
    model: 'GLC',
    year: 2021,
    vehicle_type: 'usata',
    price: 42000,
    km: 35000,
    fuel_type: 'ibrida',
    color: 'Nero',
    description: 'Mercedes-Benz GLC 300, ibrida, SUV, 35.000 km',
  },
  {
    name: 'Mercedes-Benz EQC 400',
    brand: 'mercedes',
    model: 'EQC',
    year: 2024,
    vehicle_type: 'nuova',
    price: 75000,
    fuel_type: 'elettrica',
    color: 'Bianco',
    description: 'Mercedes-Benz EQC 400, elettrica, SUV, 408 CV',
  },
  // Audi
  {
    name: 'Audi A4 2.0 TDI',
    brand: 'audi',
    model: 'A4',
    year: 2023,
    vehicle_type: 'nuova',
    price: 44000,
    fuel_type: 'diesel',
    color: 'Grigio',
    description: 'Audi A4 2.0 TDI, 190 CV, cambio automatico S tronic',
  },
  {
    name: 'Audi Q5 45 TFSI',
    brand: 'audi',
    model: 'Q5',
    year: 2022,
    vehicle_type: 'usata',
    price: 48000,
    km: 28000,
    fuel_type: 'benzina',
    color: 'Nero',
    description: 'Audi Q5 45 TFSI, SUV, 265 CV, 28.000 km',
  },
  {
    name: 'Audi e-tron GT',
    brand: 'audi',
    model: 'e-tron GT',
    year: 2024,
    vehicle_type: 'nuova',
    price: 120000,
    fuel_type: 'elettrica',
    color: 'Blu',
    description: 'Audi e-tron GT, elettrica, 530 CV, sportiva di lusso',
  },
  // Volkswagen
  {
    name: 'Volkswagen Golf 2.0 TDI',
    brand: 'volkswagen',
    model: 'Golf',
    year: 2023,
    vehicle_type: 'nuova',
    price: 32000,
    fuel_type: 'diesel',
    color: 'Bianco',
    description: 'Volkswagen Golf 2.0 TDI, 150 CV, cambio manuale',
  },
  {
    name: 'Volkswagen Tiguan 2.0 TSI',
    brand: 'volkswagen',
    model: 'Tiguan',
    year: 2022,
    vehicle_type: 'usata',
    price: 35000,
    km: 30000,
    fuel_type: 'benzina',
    color: 'Grigio',
    description: 'Volkswagen Tiguan, SUV, 190 CV, 30.000 km',
  },
  {
    name: 'Volkswagen ID.4',
    brand: 'volkswagen',
    model: 'ID.4',
    year: 2024,
    vehicle_type: 'nuova',
    price: 45000,
    fuel_type: 'elettrica',
    color: 'Blu',
    description: 'Volkswagen ID.4, elettrica, SUV, autonomia 520 km',
  },
  // Fiat
  {
    name: 'Fiat 500 Hybrid',
    brand: 'fiat',
    model: '500',
    year: 2023,
    vehicle_type: 'nuova',
    price: 22000,
    fuel_type: 'ibrida',
    color: 'Rosso',
    description: 'Fiat 500 Hybrid, ibrida, 70 CV, city car',
  },
  {
    name: 'Fiat Panda 1.2',
    brand: 'fiat',
    model: 'Panda',
    year: 2022,
    vehicle_type: 'usata',
    price: 12000,
    km: 20000,
    fuel_type: 'benzina',
    color: 'Bianco',
    description: 'Fiat Panda 1.2, 69 CV, 20.000 km, city car',
  },
  {
    name: 'Fiat Tipo 1.6 Multijet',
    brand: 'fiat',
    model: 'Tipo',
    year: 2023,
    vehicle_type: 'nuova',
    price: 25000,
    fuel_type: 'diesel',
    color: 'Grigio',
    description: 'Fiat Tipo 1.6 Multijet, 120 CV, cambio manuale',
  },
  // Peugeot
  {
    name: 'Peugeot 308 1.5 BlueHDi',
    brand: 'peugeot',
    model: '308',
    year: 2023,
    vehicle_type: 'nuova',
    price: 28000,
    fuel_type: 'diesel',
    color: 'Blu',
    description: 'Peugeot 308 1.5 BlueHDi, 130 CV, cambio automatico',
  },
  {
    name: 'Peugeot 3008 Hybrid',
    brand: 'peugeot',
    model: '3008',
    year: 2022,
    vehicle_type: 'usata',
    price: 38000,
    km: 25000,
    fuel_type: 'ibrida',
    color: 'Nero',
    description: 'Peugeot 3008 Hybrid, SUV, 225 CV, 25.000 km',
  },
  // Renault
  {
    name: 'Renault Clio 1.5 dCi',
    brand: 'renault',
    model: 'Clio',
    year: 2023,
    vehicle_type: 'nuova',
    price: 21000,
    fuel_type: 'diesel',
    color: 'Bianco',
    description: 'Renault Clio 1.5 dCi, 115 CV, cambio manuale',
  },
  {
    name: 'Renault Megane E-Tech',
    brand: 'renault',
    model: 'Megane',
    year: 2024,
    vehicle_type: 'nuova',
    price: 38000,
    fuel_type: 'elettrica',
    color: 'Grigio',
    description: 'Renault Megane E-Tech, elettrica, 220 CV, autonomia 470 km',
  },
  // Toyota
  {
    name: 'Toyota Corolla Hybrid',
    brand: 'toyota',
    model: 'Corolla',
    year: 2023,
    vehicle_type: 'nuova',
    price: 30000,
    fuel_type: 'ibrida',
    color: 'Argento',
    description: 'Toyota Corolla Hybrid, 184 CV, cambio automatico CVT',
  },
  {
    name: 'Toyota RAV4 Hybrid',
    brand: 'toyota',
    model: 'RAV4',
    year: 2022,
    vehicle_type: 'usata',
    price: 42000,
    km: 22000,
    fuel_type: 'ibrida',
    color: 'Bianco',
    description: 'Toyota RAV4 Hybrid, SUV, 218 CV, 22.000 km',
  },
  // Ford
  {
    name: 'Ford Focus 1.5 EcoBoost',
    brand: 'ford',
    model: 'Focus',
    year: 2023,
    vehicle_type: 'nuova',
    price: 27000,
    fuel_type: 'benzina',
    color: 'Blu',
    description: 'Ford Focus 1.5 EcoBoost, 150 CV, cambio manuale',
  },
  {
    name: 'Ford Kuga PHEV',
    brand: 'ford',
    model: 'Kuga',
    year: 2023,
    vehicle_type: 'nuova',
    price: 45000,
    fuel_type: 'ibrida',
    color: 'Nero',
    description: 'Ford Kuga PHEV, SUV ibrido plug-in, 225 CV',
  },
  // Altre marche
  {
    name: 'Opel Corsa 1.2',
    brand: 'opel',
    model: 'Corsa',
    year: 2023,
    vehicle_type: 'nuova',
    price: 20000,
    fuel_type: 'benzina',
    color: 'Rosso',
    description: 'Opel Corsa 1.2, 100 CV, cambio manuale',
  },
  {
    name: 'Seat Leon 2.0 TDI',
    brand: 'seat',
    model: 'Leon',
    year: 2022,
    vehicle_type: 'usata',
    price: 26000,
    km: 32000,
    fuel_type: 'diesel',
    color: 'Grigio',
    description: 'Seat Leon 2.0 TDI, 150 CV, 32.000 km',
  },
  {
    name: 'Skoda Octavia 1.5 TSI',
    brand: 'skoda',
    model: 'Octavia',
    year: 2023,
    vehicle_type: 'nuova',
    price: 29000,
    fuel_type: 'benzina',
    color: 'Bianco',
    description: 'Skoda Octavia 1.5 TSI, 150 CV, cambio automatico DSG',
  },
];

async function seedProducts(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  const units = ['milano_sales', 'roma_sales', 'torino_sales'];
  const now = new Date();

  console.log(`\n📋 Creating products for tenant: ${tenantId}\n`);

  let totalCreated = 0;

  for (const unitId of units) {
    const collName = collectionName(tenantId, unitId, 'product');
    const collection = db.collection(collName);

    // Distribute products across units (some products in each unit)
    const productsPerUnit = Math.ceil(products.length / units.length);
    const unitIndex = units.indexOf(unitId);
    const startIndex = unitIndex * productsPerUnit;
    const endIndex = Math.min(startIndex + productsPerUnit, products.length);
    const unitProducts = products.slice(startIndex, endIndex);

    for (const product of unitProducts) {
      const fullProduct: Product = {
        ...product,
        tenant_id: tenantId,
        unit_id: unitId,
        ownership: {
          owner_unit: unitId,
          visible_to: [],
        },
        visible_to: [],
        created_at: now,
        updated_at: now,
      };

      // Generate VIN if not present (format: 17 characters)
      if (!fullProduct.vin) {
        const vinChars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
        fullProduct.vin = Array.from({ length: 17 }, () =>
          vinChars.charAt(Math.floor(Math.random() * vinChars.length))
        ).join('');
      }

      // Generate license plate if not present (Italian format: AA123BB)
      if (!fullProduct.license_plate) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const plate =
          letters.charAt(Math.floor(Math.random() * letters.length)) +
          letters.charAt(Math.floor(Math.random() * letters.length)) +
          numbers.charAt(Math.floor(Math.random() * numbers.length)) +
          numbers.charAt(Math.floor(Math.random() * numbers.length)) +
          numbers.charAt(Math.floor(Math.random() * numbers.length)) +
          letters.charAt(Math.floor(Math.random() * letters.length)) +
          letters.charAt(Math.floor(Math.random() * letters.length));
        fullProduct.license_plate = plate;
      }

      await collection.insertOne(fullProduct as any);
      totalCreated++;
      console.log(
        `✅ Created: ${product.name} (${product.brand} ${product.model}) - €${product.price.toLocaleString('it-IT')} in ${unitId}`
      );
    }
  }

  console.log(`\n✅ Total products created: ${totalCreated}`);
  console.log(`📊 Distribution:`);
  for (const unitId of units) {
    const collName = collectionName(tenantId, unitId, 'product');
    const count = await db.collection(collName).countDocuments();
    console.log(`   ${unitId}: ${count} products`);
  }

  await client.close();
}

seedProducts().catch((error) => {
  console.error('Failed to seed products:', error);
  process.exit(1);
});
