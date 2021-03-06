import { GroupeNominal } from './groupe-nominal';
import { ProprieteJeu } from '../jeu/propriete-jeu';

export class ElementsPhrase {

  static readonly xDeterminantsArticles = /(le |la |les |l'|l’|un |une |des |du |de la )/i;
  static readonly xDeterminantsAdjectifsPossessifs = /(son |sa |ses |leur |leurs )/i;
  static readonly xPronomsPersonnels = /(il |elle |ils |elles )/i;
  static readonly xPronomsDemonstratif = /(ce |c’|c')/i;
  static readonly xDeterminantsEtPronoms = /(le |la |les |l'|l’|un |une |des |du |de la |son |sa |ses |leur |leurs |il |elle |ils |elles |ce |c’|c')/i;

  public proprieteSujet: ProprieteJeu;
  public proprieteComplement1: ProprieteJeu;

  public sujetComplement1: GroupeNominal;
  public sujetComplement2: GroupeNominal;
  public sujetComplement3: GroupeNominal;
  public sujetComplement4: GroupeNominal;

  public preposition0: string;
  public preposition1: string;
  public conjonction: string;
  public complement2: string;
  public complement3: string;
  public complement4: string;

  constructor(
    public infinitif: string,
    public sujet: GroupeNominal,
    public verbe: string,
    public negation: string,
    public complement1: string
  ) { }

}
