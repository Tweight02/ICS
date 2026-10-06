<?php

namespace Database\Seeders;

use App\Models\Church;
use Illuminate\Database\Seeder;

class ChurchSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | DISTRICTS AND CHURCHES
        |--------------------------------------------------------------------------
        |
        | parent_id = NULL
        |     = District
        |
        | parent_id = District church_id
        |     = Church / Company under that District
        |
        */

        $districts = [

            'Batanes' => [
                'address' => 'Batanes, Philippines',
                'churches' => [
                    ['name' => 'Pasuc', 'address' => 'Basco, Batanes, Philippines'],
                ],
            ],

            'Northwestern Cagayan' => [
                'address' => 'Northwestern Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Calayan', 'address' => 'Calayan, Cagayan, Philippines'],
                    ['name' => 'San Antonio', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Claveria Centro', 'address' => 'Claveria, Cagayan, Philippines'],
                    ['name' => 'Namuac', 'address' => 'Namuac, Cagayan, Philippines'],
                    ['name' => 'Sanchez Mira', 'address' => 'Sanchez-Mira, Cagayan, Philippines'],
                    ['name' => 'Buguey', 'address' => 'Buguey, Cagayan, Philippines'],
                    ['name' => 'San Julian', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Guzman Company', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'North Central Cagayan' => [
                'address' => 'North Central Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Cabaruan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Centro Ballesteros', 'address' => 'Ballesteros, Cagayan, Philippines'],
                    ['name' => 'Payagan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Annafunan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Linao', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Navagan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Sta. Cruz', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Mabutag', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'San Agustin', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'West Central Cagayan' => [
                'address' => 'West Central Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Pugod', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Carbonan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Bangag', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Caunayan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Matucay', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Cabarauan', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'Eastern Cagayan' => [
                'address' => 'Eastern Cagayan, Philippines',
                'churches' => [
                    ['name' => 'San Vicente', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Aparri', 'address' => 'Aparri, Cagayan, Philippines'],
                    ['name' => 'Caroan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Paytao', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Lafu', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Minanga Company', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'East Central Cagayan' => [
                'address' => 'East Central Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Logac', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Cabanaban', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Lasam', 'address' => 'Lasam, Cagayan, Philippines'],
                    ['name' => 'Ufan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Tagao', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'Northeastern Cagayan 1' => [
                'address' => 'Northeastern Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Dummun', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Ogging', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Ganzano', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Calamagui', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Matalao Company', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'Northeastern Cagayan 2' => [
                'address' => 'Northeastern Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Capirayan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'T. Putagan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Tagumay Company', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Bunnayan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Agaman Company', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'Southern Cagayan' => [
                'address' => 'Southern Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Anuling', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Caguiwan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Calantan', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Nanungaran', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Sampaguita', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Catabagan Company', 'address' => 'Cagayan, Philippines'],
                    ['name' => 'Sto. Niño Nueve Company', 'address' => 'Cagayan, Philippines'],
                ],
            ],

            'Metro Tuguegarao' => [
                'address' => 'Tuguegarao City, Cagayan, Philippines',
                'churches' => [
                    ['name' => 'Tuguegarao Central', 'address' => 'Tuguegarao City, Cagayan, Philippines'],
                    ['name' => 'Libag Company', 'address' => 'Tuguegarao City, Cagayan, Philippines'],
                    ['name' => 'Cabbo Company', 'address' => 'Tuguegarao City, Cagayan, Philippines'],
                    ['name' => 'Namnama', 'address' => 'Tuguegarao City, Cagayan, Philippines'],
                ],
            ],

            'Mallig' => [
                'address' => 'Mallig, Isabela, Philippines',
                'churches' => [
                    ['name' => 'Quiling', 'address' => 'Mallig, Isabela, Philippines'],
                    ['name' => 'Rizal', 'address' => 'Mallig, Isabela, Philippines'],
                    ['name' => 'Cullalabo', 'address' => 'Mallig, Isabela, Philippines'],
                    ['name' => 'Mabini', 'address' => 'Mallig, Isabela, Philippines'],
                    ['name' => 'Furao', 'address' => 'Mallig, Isabela, Philippines'],
                    ['name' => 'Daug', 'address' => 'Mallig, Isabela, Philippines'],
                    ['name' => 'Aurora', 'address' => 'Mallig, Isabela, Philippines'],
                ],
            ],

            'Metro Ilagan' => [
                'address' => 'Ilagan City, Isabela, Philippines',
                'churches' => [
                    ['name' => 'Sipay', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Malalam', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Rang-ayan', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Bliss', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Cabisera 14 Cataguan', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Namnama', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Cabisera 9/11', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Cabisera 7', 'address' => 'Ilagan City, Isabela, Philippines'],
                    ['name' => 'Palucpuc', 'address' => 'Ilagan City, Isabela, Philippines'],
                ],
            ],

            'Northwestern Isabela' => [
                'address' => 'Northwestern Isabela, Philippines',
                'churches' => [
                    ['name' => 'Guzon', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Bimoton', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Villa Corazon', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Carmencita', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Villa Ganzo', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Sta. Catalina', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Santiago', 'address' => 'Santiago City, Isabela, Philippines'],
                    ['name' => 'San Ramon Company', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'Northern Isabela 1' => [
                'address' => 'Northern Isabela, Philippines',
                'churches' => [
                    ['name' => 'Balembong', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Cauayan', 'address' => 'Cauayan City, Isabela, Philippines'],
                    ['name' => 'Antatan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Juan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Baybay', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Aneg', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Antonio', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Rasan Almacen', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'Northern Isabela 2' => [
                'address' => 'Northern Isabela, Philippines',
                'churches' => [
                    ['name' => 'Minano', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Lanna', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Mateo Tumauini', 'address' => 'San Mateo/Tumauini, Isabela, Philippines'],
                    ['name' => 'Antagan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Cumabao', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Lapogan', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'Northeastern Isabela' => [
                'address' => 'Northeastern Isabela, Philippines',
                'churches' => [
                    ['name' => 'Maguilan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Reina Mercedes', 'address' => 'Reina Mercedes, Isabela, Philippines'],
                    ['name' => 'Sta. Cruz', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Placer', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Disulap', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Dingasnan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Turod', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'West Central Isabela' => [
                'address' => 'West Central Isabela, Philippines',
                'churches' => [
                    ['name' => 'Laing', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Dadap', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Marana', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Cauayan Center', 'address' => 'Cauayan City, Isabela, Philippines'],
                    ['name' => 'Villa Luna', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Villa Concepcion', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Minante', 'address' => 'Cauayan City, Isabela, Philippines'],
                    ['name' => 'Naganacan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Naguilian', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Isidro', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'Western Isabela' => [
                'address' => 'Western Isabela, Philippines',
                'churches' => [
                    ['name' => 'Namnama', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Recarona', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Malasin', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Salinungan', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Villa Cruz', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Nagsabaran', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Sinamar', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Aguinaldo Company', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'North Central Isabela' => [
                'address' => 'North Central Isabela, Philippines',
                'churches' => [
                    ['name' => 'Dr. Pilar', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Burgos', 'address' => 'Burgos, Isabela, Philippines'],
                    ['name' => 'Mabini', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Villa Domingo', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Vega', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Dipalua', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Ambrocio', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'South Central Isabela' => [
                'address' => 'South Central Isabela, Philippines',
                'churches' => [
                    ['name' => 'Alicia', 'address' => 'Alicia, Isabela, Philippines'],
                    ['name' => 'Villa Flor', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Naguilian', 'address' => 'Naguilian, Isabela, Philippines'],
                    ['name' => 'Gomez', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Angoleon', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Doña Faustina', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Castillo Company', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Loida', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Reserva Company', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Guillermo', 'address' => 'San Guillermo, Isabela, Philippines'],
                ],
            ],

            'Southeastern Isabela' => [
                'address' => 'Southeastern Isabela, Philippines',
                'churches' => [
                    ['name' => 'San Manuel', 'address' => 'San Manuel, Isabela, Philippines'],
                    ['name' => 'Sta. Maria', 'address' => 'Santa Maria, Isabela, Philippines'],
                    ['name' => 'Villa Marina', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Isidro', 'address' => 'Isabela, Philippines'],
                    ['name' => 'San Antonio', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Sto. Niño', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Mapalad Company', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Sta. Ana', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'Southern Isabela' => [
                'address' => 'Southern Isabela, Philippines',
                'churches' => [
                    ['name' => 'Divisoria', 'address' => 'Santiago City, Isabela, Philippines'],
                    ['name' => 'Ahso', 'address' => 'Isabela, Philippines'],
                    ['name' => 'Santiago', 'address' => 'Santiago City, Isabela, Philippines'],
                    ['name' => 'Cordon', 'address' => 'Cordon, Isabela, Philippines'],
                    ['name' => 'Sta. Rosa Company', 'address' => 'Isabela, Philippines'],
                ],
            ],

            'Quirino West' => [
                'address' => 'Western Quirino, Philippines',
                'churches' => [
                    ['name' => 'Salvacion', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Saguday', 'address' => 'Saguday, Quirino, Philippines'],
                    ['name' => 'Bangar', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Sta. Ana', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Cabbaga', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Diffun', 'address' => 'Diffun, Quirino, Philippines'],
                    ['name' => 'La Paz Company', 'address' => 'Quirino, Philippines'],
                ],
            ],

            'Quirino East' => [
                'address' => 'Eastern Quirino, Philippines',
                'churches' => [
                    ['name' => 'Diobol Company', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Dumbo Company', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Diguyon', 'address' => 'Quirino, Philippines'],
                    ['name' => 'Diffun Company', 'address' => 'Diffun, Quirino, Philippines'],
                    ['name' => 'Puagbo', 'address' => 'Quirino, Philippines'],
                ],
            ],

            'Northern Nueva Vizcaya' => [
                'address' => 'Northern Nueva Vizcaya, Philippines',
                'churches' => [
                    ['name' => 'Namanparan', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Sinuhan Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Sta. Cruz', 'address' => 'Bagabag, Nueva Vizcaya, Philippines'],
                    ['name' => 'Bagabag', 'address' => 'Bagabag, Nueva Vizcaya, Philippines'],
                    ['name' => 'Solano', 'address' => 'Solano, Nueva Vizcaya, Philippines'],
                    ['name' => 'Aggub', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Communal', 'address' => 'Solano, Nueva Vizcaya, Philippines'],
                ],
            ],

            'Southwestern Nueva Vizcaya' => [
                'address' => 'Southwestern Nueva Vizcaya, Philippines',
                'churches' => [
                    ['name' => 'Kirapa Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Indiana', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Alimaguio', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Tucanon', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Alibao', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Bone', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Ilaan Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Comon', 'address' => 'Nueva Vizcaya, Philippines'],
                ],
            ],

            'Southeastern Nueva Vizcaya' => [
                'address' => 'Southeastern Nueva Vizcaya, Philippines',
                'churches' => [
                    ['name' => 'Ramang', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Paungan', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Abinganan', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Malasin', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Belance', 'address' => 'Kasibu, Nueva Vizcaya, Philippines'],
                    ['name' => 'Manakka', 'address' => 'Nueva Vizcaya, Philippines'],
                ],
            ],

            'Eastern Nueva Vizcaya' => [
                'address' => 'Eastern Nueva Vizcaya, Philippines',
                'churches' => [
                    ['name' => 'Kinogkiran Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Canamasi Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Cordon', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Macalong', 'address' => 'Kasibu, Nueva Vizcaya, Philippines'],
                    ['name' => 'Kongkong Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Paqui', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Moya Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Maglan', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Palia', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Poblacion', 'address' => 'Nueva Vizcaya, Philippines'],
                ],
            ],

            'Central Nueva Vizcaya' => [
                'address' => 'Central Nueva Vizcaya, Philippines',
                'churches' => [
                    ['name' => 'La Torre', 'address' => 'Bayombong, Nueva Vizcaya, Philippines'],
                    ['name' => 'Masoc', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Pinket Company', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Ramabong', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Busilac', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Paitan', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Sto. Domingo', 'address' => 'Nueva Vizcaya, Philippines'],
                    ['name' => 'Palaran Company', 'address' => 'Nueva Vizcaya, Philippines'],
                ],
            ],
        ];

        /*
        |--------------------------------------------------------------------------
        | INSERT DATA
        |--------------------------------------------------------------------------
        */

        foreach ($districts as $districtName => $districtData) {

            // Create / update District
            $district = Church::updateOrCreate(
                [
                    'name' => $districtName,
                    'parent_id' => null,
                ],
                [
                    'address' => $districtData['address'],
                ]
            );

            // Create / update Churches and Companies
            foreach ($districtData['churches'] as $church) {

                Church::updateOrCreate(
                    [
                        'name' => $church['name'],
                        'parent_id' => $district->church_id,
                    ],
                    [
                        'address' => $church['address'],
                    ]
                );
            }
        }
    }
}