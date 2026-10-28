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
        | Districts are parent records. Churches and companies are stored as
        | children of their district. Worship groups are not separate churches.
        |
        */

        $territories = [
            'Batanes, Philippines' => [
                'Batanes' => [
                    'Basco',
                ],
            ],
            'Cagayan, Philippines' => [
                'East Central Cagayan' => [
                    'Cabayabasan',
                    'Lasam',
                    'Logac',
                    'Tagao',
                    'Utan',
                ],
                'Southern Cagayan' => [
                    'Afusing',
                    'Calilliauan',
                    'Calintaan',
                    'Nanungaran',
                    'Sampaguita',
                    'Cataraoan',
                    'Sto. Niño, Faire Company',
                    'Bugnay Company',
                    'Tuao Company',
                ],
                'Northwestern Cagayan' => [
                    'Bidduang',
                    'Calayan',
                    'Claveria Centro',
                    'Guiddam',
                    'Namuac',
                    'Sanchez Mira',
                    'San Antonio (Claveria)',
                    'San Julian',
                    'Culao Company',
                ],
                'Metro Tuguegarao' => [
                    'Nannarian',
                    'Tuguegarao Central',
                    'Cabbo Church',
                    'Capatan (Libag) Company',
                ],
                'Northeastern Cagayan 1' => [
                    'Calamagui',
                    'Dummun',
                    'Ganzano',
                    'Guising',
                    'Matalao',
                ],
                'North Central Cagayan' => [
                    'Ammubuan',
                    'Cabaritan',
                    'Centro Ballesteros',
                    'Linao',
                    'Mabuttal',
                    'Navagan',
                    'Payagan',
                    'San Agustin',
                    'Sta. Cruz',
                ],
                'West Central Cagayan' => [
                    'Bangag',
                    'Calintaan',
                    'Caroronan',
                    'Cataratan',
                    'Matucay',
                    'Pugod (Caranan)',
                ],
                'Eastern Cagayan' => [
                    'Aparri',
                    'Caroan',
                    'San Antonio (Lafu)',
                    'Pattao',
                    'San Vicente',
                    'Minanga (Buguey) Company',
                ],
                'Northeastern Cagayan 2' => [
                    'Capissayan',
                    'Bunnayan',
                    'T. Elizaga',
                    'Agaman Company',
                    'Tagumay Company',
                ],
            ],
            'Isabela, Philippines' => [
                'Metro Ilagan 1' => [
                    'Bliss',
                    'Malalam',
                    'Namnama',
                    'Sipay',
                    'Carikkikan Company',
                ],
                'Southern Isabela' => [
                    'AHSCI',
                    'Santiago',
                    'Divisoria',
                    'Cordon (Centro)',
                    'Naggasican',
                    'Sta. Rosa Company',
                ],
                'North Central Isabela' => [
                    'Burgos',
                    'Cauayan Center',
                    'Del Pilar',
                    'Dipaluda',
                    'Mabini',
                    'Minante',
                    'Naganacan',
                    'Nagrumbuan',
                    'San Isidro Hills',
                    'Viga',
                    'Villa Concepcion',
                    'Villa Domingo',
                    'Villa Luna',
                    'Rizal Company',
                ],
                'Northeastern Isabela' => [
                    'Dingading',
                    'Disulap',
                    'Naguilian',
                    'Placer',
                    'Reina Mercedes',
                    'Sta. Cruz (Benito Soliven)',
                ],
                'Southeastern Isabela' => [
                    'San Antonio (Jones)',
                    'San Isidro',
                    'Sta. Ana',
                    'San Manuel',
                    'Sta. Maria',
                    'Sto. Niño',
                    'Villa Fermin',
                    'Mapalad (San Agustin) Company',
                ],
                'Costa Pacifica' => [
                    'Maconacon',
                ],
                'South Central Isabela' => [
                    'Angoluan',
                    'Victoria (Doña Paulina)',
                    'Gomez',
                    'Nagbukel',
                    'Reserva (Busilelao) Church',
                    'Villaflor',
                    'Castillo Company',
                ],
                'Metro Ilagan 2' => [
                    'Cabisera 7',
                    'Cabisera 9/11',
                    'Casilagan',
                    'Paliueg',
                    'Rang-ayan',
                    'Sta. Catalina Company',
                ],
                'NELAC' => [
                    'NELAC Church',
                ],
                'Northern Isabela 2' => [
                    'Antagan',
                    'Cumabao',
                    'Lanna',
                    'Lapogan',
                    'Minare',
                    'San Mateo (Tumauini)',
                ],
                'Northern Isabela 1' => [
                    'Andarayan',
                    'Aneg',
                    'Barumbong',
                    'Bayabo',
                    'Calinaoan',
                    'Ragan Almacen',
                    'San Antonio',
                    'San Juan (Delfin Albano)',
                ],
                'Northwestern Isabela' => [
                    'Bimonton',
                    'Carmencita',
                    'Quezon',
                    'Santiago (Quirino-Isa)',
                    'Sta. Catalina',
                    'Villa Corazon',
                    'Villa Ginez',
                    'San Ramon',
                    'Siempre Viva',
                ],
                'Mallig' => [
                    'Aurora',
                    'Cullalabo',
                    'Dalig',
                    'Furao',
                    'Mabini (Gamu)',
                    'Quiling',
                    'Roxas',
                    'Manaoag Company',
                ],
                'East Central Isabela' => [
                    'Alicia',
                    'Loria',
                    'Salvacion (Alicia)',
                    'San Ambrocio',
                    'San Guillermo',
                    'Landing Company',
                    'Minanga Company',
                ],
                'Western Isabela' => [
                    'Aguinaldo',
                    'Bacarreña',
                    'Dadap',
                    'Harana',
                    'Lalog',
                    'Malasin (San Mateo)',
                    'Nagbacalan',
                    'Namnama (Ramon)',
                    'Salinungan',
                    'Sinamar',
                    'Villa Cruz',
                ],
            ],
            'Quirino, Philippines' => [
                'Quirino East' => [
                    'Diduyon',
                    'Ponggo',
                    'Dungo Company',
                    'Dipintin Company',
                    'Diodol Company',
                    'Tangliyao Company',
                ],
                'Quirino West' => [
                    'Banuar',
                    'Der-an',
                    'Diffun',
                    'Gabriela',
                    'La Paz',
                    'Saguday (Rizal)',
                    'Salvacion',
                ],
            ],
            'Nueva Vizcaya, Philippines' => [
                'Southwestern Nueva Vizcaya' => [
                    'Aritao',
                    'Almaguer',
                    'Bone',
                    'Comon',
                    'Indiana',
                    'Tucanon',
                    'Baan',
                ],
                'Southeastern Nueva Vizcaya' => [
                    'Abinganan',
                    'Belance',
                    'Malasin (Dupax Del Norte)',
                    'Bambang',
                    'Paungan',
                    'Mantatta',
                    'Guingen (Gumiad)',
                    'Arillian',
                ],
                'Northern Nueva Vizcaya' => [
                    'Aggub',
                    'Bagabag',
                    'Communal',
                    'Namamparan/Diadi',
                    'Solano',
                    'Sta. Cruz',
                    'Bintawan Company',
                    'Aurora (Quezon) Company',
                ],
                'Upper Nueva Vizcaya' => [
                    'Binogawan',
                    'Camamasi',
                    'Cordon (Upper Nueva Vizcaya)',
                    'Kongkong',
                    'Macalong',
                    'Maglan',
                    'Muta',
                    'Palla',
                    'Paquet',
                    'Poblacion',
                ],
                'Central Nueva Vizcaya' => [
                    'Bayombong',
                    'Busilac',
                    'La Torre',
                    'Masoc',
                    'Paitan',
                    'Palaran',
                    'Pawak',
                    'Sto. Domingo',
                ],
            ],
        ];

        foreach ($territories as $address => $districts) {
            foreach ($districts as $districtName => $churches) {
                $district = Church::firstOrCreate(
                    [
                        'name' => $districtName,
                        'parent_id' => null,
                    ],
                    [
                        'address' => $address,
                    ]
                );

                foreach ($churches as $churchName) {
                    Church::firstOrCreate(
                        [
                            'name' => $churchName,
                            'parent_id' => $district->church_id,
                        ],
                        [
                            'address' => $address,
                        ]
                    );
                }
            }
        }
    }
}
