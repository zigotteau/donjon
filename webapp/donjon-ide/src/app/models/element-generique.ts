import { ElementDonjon } from './element-donjon';
import { Genre } from './genre.enum';
import { Nombre } from './nombre.enum';
import { PositionSujet } from './position-sujet';

export class ElementGenerique implements ElementDonjon {

  constructor(
    public nom: string,
    public determinant: string,
    public genre: Genre,
    public nombre: Nombre,
    public position: PositionSujet
  ) { }

}
