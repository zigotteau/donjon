import { Condition, LienCondition } from '../models/compilateur/condition';

import { Action } from '../models/compilateur/action';
import { Capacite } from '../models/compilateur/capacite';
import { Definition } from '../models/compilateur/definition';
import { ElementGenerique } from '../models/compilateur/element-generique';
import { ElementsPhrase } from '../models/commun/elements-phrase';
import { Genre } from '../models/commun/genre.enum';
import { GroupeNominal } from '../models/commun/groupe-nominal';
import { Instruction } from '../models/compilateur/instruction';
import { Monde } from '../models/compilateur/monde';
import { Nombre } from '../models/commun/nombre.enum';
import { Phrase } from '../models/compilateur/phrase';
import { PhraseUtils } from './phrase-utils';
import { PositionSujetString } from '../models/compilateur/position-sujet';
import { Propriete } from '../models/compilateur/propriete';
import { Regle } from '../models/compilateur/regle';
import { ResultatCompilation } from '../models/compilateur/resultat-compilation';
import { TypeElement } from '../models/commun/type-element.enum';
import { TypeRegle } from '../models/compilateur/type-regle';
import { TypeValeur } from '../models/compilateur/type-valeur';
import { Verification } from '../models/compilateur/verification';

export class Compilateur {

  static verbeux = true;

  // DESCRIPTION DU DONJON

  // Caractères réservés:
  // Ƶ et ƶ − commentaire
  static readonly caractereDebutCommentaire = 'Ƶ';
  static readonly caractereFinCommentaire = 'ƶ';
  static readonly xCaracteresCommentaire = /Ƶ|ƶ/g;
  static readonly xCaractereDebutCommentaire = /Ƶ/g;
  static readonly xCaractereFinCommentaire = /ƶ/g;
  //   Ʒ − retour à la ligne
  static readonly caractereRetourLigne = 'Ʒ';
  static readonly xCaractereRetourLigne = /Ʒ/g;

  /** élément générique positionné par rapport à complément -> determinant(1), nom(2), féminin?(3), type(4), attributs(5), position(6), genre complément(7), complément(8) */
  static readonly xPositionElementGeneriqueDefini = /^(le |la |l(?:’|')|les )(.+?)(\(.+\))? (?:est|sont) (?:|(?:un|une|des) (.+?)(| .+?) )?((?:(?:à l(?:’|')intérieur|à l(?:’|')extérieur|au sud|au nord|à l(?:’|')est|à l(?:’|')ouest|en haut|en bas) (?:du |de la |de l(?:’|')|des ))|(?:dans (?:la |le |l(?:’|')|les |un | une )|de (?:la |l(?:’|'))|du ))(.+)/i;

  // readonly xPositionElementGeneriqueIndefini = /^(un |une |des )(\S+?) (.+?)(\(f\))? (?:est|sont) ((?:(?:à l(?:’|')intérieur|au sud|au nord|à l(?:’|')est|à l(?:’|')ouest) (?:du |de la |de l(?:’|')|des ))|(?:dans (?:la |le |l(?:’|')|les )|de (?:la |l(?:’|'))|du ))(.+)/i;
  /** élément générique positionné par rapport à complément :
   * -> soit : determinant(1)), type(2), nom(2+3), attributs(3), féminin?(4), position(9), complément(10)
   * -> soit : determinant(5), type(6), nom(6+7), attributs(7), féminin?(8), position(9), complément(10)
   */
  static readonly xPositionElementGeneriqueIndefini = /^(?:(?:il y a (un |une |des |du |de l(?:’|')|[1-9]\d* )(\S+)(?: (.+?))?(\(f\))?)|(?:(un |une |des |du |de l(?:’|'))(\S+)(?: (.+?))?(\(.+\))? (?:est|sont))) ((?:(?:à l(?:’|')intérieur|à l(?:’|')extérieur|au sud|au nord|à l(?:’|')est|à l(?:’|')ouest|en haut|en bas) (?:du |de la |de l(?:’|')|des ))|(?:(?:dans|sur) (?:la |le |l(?:’|')|les |un |une )))(.+)/i;

  /** élément générique simple -> determinant(1), nom(2), féminin?(3), type(4), attributs(5) */
  static readonly xDefinitionTypeElement = /^(le |la |l(?:’|')|les )(.+?)(\(.+\))? (?:est|sont) (?:un|une|des) (\S+)( .+|)/i;

  /** pronom démonstratif -> determinant(1), type(2), attributs(3) */
  static readonly xPronomDemonstratif = /^((?:c'est (?:un|une))|(?:ce sont des)) (\S+)( .+|)/i;

  /** pronom personnel position -> position(1), complément(2) */
  static readonly xPronomPersonnelPosition = /^(?:(?:(?:il|elle|celui-ci|celle-ci) est)|(?:(?:ils|elles|celles-ci|ceux-ci) sont)) (?:(?:(à l(?:’|')intérieur|au sud|au nord|à l(?:’|')est|à l(?:’|')ouest|en haut|en bas) (?:du |de la |de l(?:’|')|des ))|(?:dans (?:la |le |l(?:’|')|un |une )|de (?:la |l(?:’|'))|du ))(.+)/i;
  /** pronom personnel -> attributs(1) */
  static readonly xPronomPersonnelAttribut = /^(?:(?:(?:il|elle|celui-ci|celle-ci) est)|(?:(?:ils|elles|celles-ci|ceux-ci) sont))((?!une |un |des ) (?:.+[^,])(?:$| et (?:.+[^,])|(?:, .+[^,])+ et (?:.+[^,])))/i;

  /** attribut
   *  - son|sa propriété(1) est|vaut(4) valeur(5)
   *  - la|le|l' proriété(2) du|de la|de l' complément(3) est|vaut(4) valeur(5)
   */
  static readonly xAttribut = /^(?:(?:(?:son|sa) (\S+))|(?:(?:la |le |l(?:’|'))(\S+) (?:du |de la |de l(?:’|'))(\S+))) (est|vaut)( .+|)/i;

  /** capacité -> verbe(1) complément(2) */
  static readonly xCapacite = /^(?:(?:(?:il|elle) permet)|(?:(?:ils|elles) permettent)) (?:de |d(?:’|'))(se \S+|\S+)( .+|)/i;

  /** élément générique -> déterminant (1), nom (2), féminin?(3) attributs(4).
   * ex: Le champignon est brun et on peut le cuillir.
   */
  static readonly xElementSimpleAttribut = /^(le |la |l(?:’|')|les )(.+?)(\(f\))? (?:est|sont) ((?!une |un |des |dans )(?:.+[^,])(?:$| et (?:.+[^,])|(?:, .+[^,])+ et (?:.+[^,])))/i;

  static readonly xNombrePluriel = /^[2-9]\d*$/;

  /** nouvelle action => verbe(1) [ ceci(2)[(?: \S+) cela(3)]] est une action[ qui concerne un|une|deux(4) typeObjetA(5) attributObjetA(6) [et un|une(7) typeObjetB(8) attributObjetB(9)]]
   * ex: Jeter est une action qui concerne un objet possédé.
   * ex: Examiner est une action qui concerne un objet visible.
   */
  static readonly xAction = /^((?:se )?\S+(?:ir|er|re))(?: (ceci)(?:(?: \S+) (cela))?)? est une action(?: qui concerne (un|une|deux) (\S+)(?: (\S+))?(?: et (un|une) (\S+)(?: (\S+))?)?)?$/i;
  /** Le joueur peut verbe(1) [déterminant(2) nom(3) epithete(4)]: instructions(5) */
  static readonly xActionSimple = /^Le joueur peut ((?:se )?\S+(?:ir|er|re))(?: (le |la |les |l(?:’|')|des |de l(?:’|')|de la |du )(\S+)(?: (\S+))?)?:(.+)?$/i;

  /** Description d'une action => [refuser|exécuter|finaliser]\(1) verbe(2) [ceci(3) [(avec|et) cela(4)]]: instructions(5) */
  static readonly xDescriptionAction = /^(refuser|exécuter|finaliser) ((?:se )?\S+(?:ir|er|re))(?: (ceci)(?:(?: \S+) (cela))?)?\s?:(.+)$/i;

  // INSTRUCTION

  /** condition/événement -> avant|après|remplacer|si\(1) {condition}(2), {conséquences}(3) */
  static readonly rAvantApresRemplacerSi = /^(avant|après|remplacer|si) (.+)(?:,|:)(.+)/i;
  /** condition -> si(1) {condition}(2), {conséquence}(3) */
  static readonly rRefuser = /^(si) (.+)(?:,)(.+)/i;

  /**
   * Interpréter le code source fourni et renvoyer le jeu correspondant.
   * @param source Code à interpréter.
   */
  public static parseCode(source: string): ResultatCompilation {
    // le monde qui est décrit
    let monde = new Monde();
    let regles = new Array<Regle>();
    let erreurs = new Array<string>();
    let actions = new Array<Action>();

    let dernierePropriete: Propriete = null;
    let dernierElementGenerique: ElementGenerique = null;

    // gestion des commentaires de ligne (--)
    // => si une ligne commence par «--» on ajoute automatiquement un «.» (fin d’instruction)
    // à la fin de la ligne pour éviter que l’utilisateur ne soit obligé de terminer ses
    // commentaires par un «.».
    const CommentairesCorriges = source.replace(/^--(.+)?$/mg, "--$1.");

    // remplacer les retours à la ligne par un caractereRetourLigne.
    // remplacer les éventuels espaces consécutifs par un simple espace.
    // retirer les espaces avant et après le bloc de texte.
    const blocTexte = CommentairesCorriges.replace(/(\r\n|\r|\n)/g, this.caractereRetourLigne).replace(/( +)/g, " ").trim();

    // séparer les chaines de caractères (entre " ") du code
    const blocsCodeEtCommentaire = blocTexte.split('"');

    let phrases = new Array<Phrase>();
    let indexPhrase = 0;
    let numeroLigne = 1;
    let premiereLigne = true;
    let phrasePrecedente: Phrase = null;
    // si le bloc de texte commence par " on commence avec un bloc de commentaire
    let blocSuivantEstCode = true;
    if (blocTexte[0] === '"') {
      blocSuivantEstCode = false;
    }

    // séparer les blocs en phrases sauf les commentaires
    blocsCodeEtCommentaire.forEach(bloc => {
      if (bloc !== '') {
        // bloc de code, séparer les phrases (sur les '.')
        if (blocSuivantEstCode) {
          const phrasesBrutes = bloc.split('.');
          for (let k = 0; k < phrasesBrutes.length; k++) {
            const phraseBrute = phrasesBrutes[k];
            // compte le nombre de lignes pour ne pas se décaller !
            const nbLignes = (phraseBrute.match(this.xCaractereRetourLigne) || []).length;

            // si ce n’est pas la dernière phrase elle est forcément finie
            // si c’est la fin du bloc et qu’elle se termine par un point, la phrase est finie également.
            const trimBloc = bloc.trim();
            const finie = ((k < (phrasesBrutes.length - 1)) || (trimBloc.lastIndexOf(".") === (trimBloc.length - 1)));

            // enlever le "." et remplacer les retours à la ligne par des espaces
            const phraseNettoyee = phraseBrute.replace('.', '').replace(this.xCaractereRetourLigne, " ").trim();

            // nouvelle phrase
            if (!phrasePrecedente || phrasePrecedente.finie) {
              if (phraseNettoyee !== '') {
                phrasePrecedente = new Phrase([phraseNettoyee], false, false, null, indexPhrase++, numeroLigne, finie);
                phrases.push(phrasePrecedente);
              }
              // suite de la phrase précédente
            } else {
              if (phraseNettoyee !== '') {
                phrasePrecedente.phrase.push(phraseNettoyee);
              }
              phrasePrecedente.finie = finie;
            }

            numeroLigne += nbLignes; //Math.max(1, nbLignes);
          }
          // si le bloc est un commentaire, l'ajouter tel quel :
        } else {
          // compte le nombre de lignes pour ne pas se décaller !
          const nbLignes = (bloc.match(this.xCaractereRetourLigne) || []).length;
          // remplacer les caractereRetourLigne par des espaces
          const phraseNettoyee = bloc.replace(this.xCaractereRetourLigne, ' ').trim();

          // le commentaire concerne toujours la phrase précédente (s'il y en a une)
          if (phrasePrecedente) {
            phrasePrecedente.phrase.push(this.caractereDebutCommentaire + bloc + this.caractereFinCommentaire);
            // sinon, le commentaire est seul (c'est le titre)
          } else {
            phrases.push(new Phrase([bloc], true, false, null, indexPhrase++, numeroLigne, true));
          }
          numeroLigne += nbLignes; // Math.max(1, nbLignes);
        }
        // fix: il n'y a pas de retour à la ligne au début de la première ligne
        if (premiereLigne) {
          premiereLigne = false;
          numeroLigne += 1;
        }
        blocSuivantEstCode = !blocSuivantEstCode;
      }
    });

    if (Compilateur.verbeux) {
      console.log("Voici les phrases: ", phrases);
    }

    // retrouver les éléments dans le code source
    let typesUtilisateur: Map<string, Definition> = new Map();
    let elementsGeneriques = new Array<ElementGenerique>();
    let result: RegExpExecArray;

    // ajouter le joueur au monde
    elementsGeneriques.push(new ElementGenerique("le ", "joueur", "joueur", TypeElement.joueur, null, Genre.m, Nombre.s, 1, null));
    elementsGeneriques.push(new ElementGenerique("l’", "inventaire", "inventaire", TypeElement.inventaire, null, Genre.m, Nombre.s, 1, null));

    phrases.forEach(phrase => {

      // 1) COMMENTAIRE
      if (phrase.commentaire) {
        // si c'est le premier boc du code, il s'agit du titre
        if (phrase.ordre === 0) {
          monde.titre = phrase.phrase[0];
          // sinon, le commentaire se rapporte au dernier sujet
        } else {
          console.error("Commentaire pas attaché :", phrase.phrase[0]);
        }
        phrase.traitee = true;

        // 2) CODE DESCRIPTIF OU REGLE
      } else {

        if (Compilateur.verbeux) {
          console.log("Analyse: ", phrase);
        }

        // 0 - SI PREMIER CARACTÈRE EST UN TIRET (-), NE PAS INTERPRÉTER
        if (phrase.phrase[0].slice(0, 2) === "--") {
          phrase.traitee = true;
          if (Compilateur.verbeux) {
            console.log("Je passe le commentaire");
          }
        } else {

          let elementGeneriqueTrouve = false;
          let regleTrouvee = false;
          let actionTrouvee = false;
          let proprieteTrouvee = false;
          // ===============================================
          // RÈGLES
          // ===============================================

          regleTrouvee = Compilateur.testerRegle(regles, phrase, erreurs);

          // ===============================================
          // ACTIONS
          // ===============================================

          if (!regleTrouvee) {
            actionTrouvee = Compilateur.testerAction(actions, phrase, erreurs);
          }

          // ===============================================
          // MONDE
          // ===============================================

          if (!regleTrouvee && !actionTrouvee) {

            // on part du principe qu’on va trouver quelque chosee, sinon on le mettra à faux.
            elementGeneriqueTrouve = true;

            // 1 - TESTER NOUVEL ÉLÉMENT / ÉLÉMENT EXISTANT AVEC POSITION
            let elementConcerne = Compilateur.testerPosition(elementsGeneriques, phrase);
            if (elementConcerne) {
              dernierElementGenerique = elementConcerne;
              if (Compilateur.verbeux) {
                console.log("Réslultat: test 1:", dernierElementGenerique);
              }
            } else {
              // 2 - TESTER NOUVEL ÉLÉMENT / ÉLÉMENT EXISTANT SANS POSITION
              elementConcerne = Compilateur.testerElementSimple(typesUtilisateur, elementsGeneriques, phrase);
              if (elementConcerne) {
                dernierElementGenerique = elementConcerne;
                if (Compilateur.verbeux) {
                  console.log("Réslultat: test 2:", dernierElementGenerique);
                }
              } else {
                // 3 - TESTER LES INFORMATIONS SE RAPPORTANT AU DERNIER ÉLÉMENT
                // pronom démonstratif
                result = Compilateur.xPronomDemonstratif.exec(phrase.phrase[0]);
                if (result !== null) {
                  // définir type de l'élément précédent
                  if (result[2] && result[2].trim() !== '') {
                    dernierElementGenerique.type = Compilateur.getTypeElement(result[2]);
                  }
                  // attributs de l'élément précédent
                  if (result[3] && result[3].trim() !== '') {
                    dernierElementGenerique.attributs.push(result[3]);
                  }
                  if (Compilateur.verbeux) {
                    console.log("Réslultat: test 3:", dernierElementGenerique);
                  }
                } else {
                  // pronom personnel position
                  result = Compilateur.xPronomPersonnelPosition.exec(phrase.phrase[0]);
                  if (result !== null) {
                    // genre de l'élément précédent
                    dernierElementGenerique.genre = Compilateur.getGenre(phrase.phrase[0].split(" ")[0], null);
                    // attributs de l'élément précédent
                    dernierElementGenerique.positionString = new PositionSujetString(dernierElementGenerique.nom, result[2], result[1]);
                    if (Compilateur.verbeux) {
                      console.log("Réslultat: test 4:", dernierElementGenerique);
                    }
                  } else {
                    // pronom personnel attributs
                    result = Compilateur.xPronomPersonnelAttribut.exec(phrase.phrase[0]);
                    if (result !== null) {
                      // attributs de l'élément précédent
                      if (result[1] && result[1].trim() !== '') {
                        // découper les attributs
                        const attributs = Compilateur.getAttributs(result[1]);
                        dernierElementGenerique.attributs = dernierElementGenerique.attributs.concat(attributs);
                      }
                      // genre de l'élément précédent
                      dernierElementGenerique.genre = Compilateur.getGenre(phrase.phrase[0].split(" ")[0], null);

                      if (Compilateur.verbeux) {
                        console.log("Réslultat: test 5:", dernierElementGenerique);
                      }
                    } else {
                      result = Compilateur.xAttribut.exec(phrase.phrase[0]);

                      if (result) {

                        proprieteTrouvee = true;

                        // cas 1 (son/sa xxx est)
                        if (result[1]) {
                          dernierePropriete = new Propriete(result[1], (result[4] === 'vaut' ? TypeValeur.nombre : TypeValeur.mots), result[5]);
                          // ajouter la propriété au dernier élément
                          dernierElementGenerique.proprietes.push(dernierePropriete);
                          if (Compilateur.verbeux) {
                            console.log("Réslultat: test 6:", dernierElementGenerique);
                          }
                          // cas 2 (la xxx de yyy est)
                        } else {
                          const complement = result[3];
                          dernierePropriete = new Propriete(result[2], (result[4] === 'vaut' ? TypeValeur.nombre : TypeValeur.mots), result[5]);

                          // récupérer l’élément concerné
                          // TODO: Check que c'est le bon qui est rouvé !!!
                          let foundElementGenerique = elementsGeneriques.find(x => x.nom == complement);
                          if (foundElementGenerique) {
                            foundElementGenerique.proprietes.push(dernierePropriete);
                          } else {
                            console.warn("Test 6: Pas trouvé le complément:", complement);
                          }
                        }
                      } else {
                        result = Compilateur.xCapacite.exec(phrase.phrase[0]);

                        if (result) {
                          const capacite = new Capacite(result[1], (result[2] ? result[2].trim() : null));
                          // ajouter la capacité au dernier élément
                          dernierElementGenerique.capacites.push(capacite);
                          if (Compilateur.verbeux) {
                            console.log("Réslultat: test 7:", dernierElementGenerique);
                          }
                        } else {
                          // et bien finalement on n’a rien trouvé…
                          elementGeneriqueTrouve = false;
                          erreurs.push(("00000" + phrase.ligne).slice(-5) + " : " + phrase.phrase);
                          if (Compilateur.verbeux) {
                            console.warn("Pas trouvé la signification de la phrase.");
                          }
                        }
                      }
                    }
                  }

                }
              }
            }
          } // fin test monde

          // si on a trouvé est un élément générique
          if (elementGeneriqueTrouve) {
            // si phrase en plusieurs morceaux, ajouter commentaire qui suit.
            if (phrase.phrase.length > 1) {
              // si le dernier élément trouvé est une propriété, il s'agit de
              // la valeur de cette propriété
              if (proprieteTrouvee) {
                if (this.verbeux) {
                  console.log(">>> Ajout de la description à la dernière propriété.");
                }
                // ajouter la valeur en enlevant les caractères spéciaux
                dernierePropriete.valeur = phrase.phrase[1]
                  .replace(this.xCaractereDebutCommentaire, '')
                  .replace(this.xCaractereFinCommentaire, '')
                  .replace(this.xCaractereRetourLigne, '\n');

                // sinon c’est la description du dernier élément
              } else {
                if (this.verbeux) {
                  console.log(">>> Ajout de la description au dernier élément générique.");
                }
                // ajouter la description en enlevant les caractères spéciaux
                dernierElementGenerique.description = phrase.phrase[1]
                  .replace(this.xCaracteresCommentaire, '')
                  .replace(this.xCaractereRetourLigne, '\n');
              }
            }
            // si on a trouvé une règle
          } else if (regleTrouvee) {
            if (this.verbeux) {
              console.log(">>> regleTrouvee");
            }
          } else if (actionTrouvee) {
            if (this.verbeux) {
              console.log(">>> actionTrouvee");
            }
          }

        } // fin analyse phrase != commentaire
      } // fin analyse de la phrase
    });

    if (Compilateur.verbeux) {
      console.log("definitions: ", typesUtilisateur);
    }
    // *****************************
    // CLASSER LES ÉLÉMENTS PAR TYPE
    // *****************************
    elementsGeneriques.forEach(el => {

      switch (el.type) {
        case TypeElement.salle:
          monde.salles.push(el);
          break;

        case TypeElement.porte:
          monde.portes.push(el);
          break;

        case TypeElement.joueur:
          monde.joueurs.push(el);
          break;

        case TypeElement.inventaire:
          monde.inventaires.push(el);
          break;

        case TypeElement.objet:
        case TypeElement.decor:
        case TypeElement.contenant:
        case TypeElement.support:
        case TypeElement.animal:
        case TypeElement.cle:
          // case TypeElement.inconnu:
          // case TypeElement.aucun:
          monde.objets.push(el);
          break;

        case TypeElement.aucun:
        case TypeElement.inconnu:
          monde.aucuns.push(el);
          break;

        default:
          break;
      }

    });

    // *************************
    // SÉPARER LES CONSÉQUENCES
    // *************************

    regles.forEach(regle => {
      if (regle.consequencesBrutes) {
        regle.instructions = Compilateur.separerConsequences(regle.consequencesBrutes, erreurs, false);
      }
      console.log(">>> regle:", regle);
    });

    if (Compilateur.verbeux) {
      console.log("==================\n");
      console.log("monde:", monde);
      console.log("règles:", regles);
      console.log("actions:", actions);
      console.log("typesUtilisateur:", typesUtilisateur);
      console.log("==================\n");
    }

    let resultat = new ResultatCompilation();
    resultat.monde = monde;
    resultat.regles = regles;
    resultat.actions = actions;
    resultat.erreurs = erreurs;
    return resultat;
  }

  private static separerConsequences(consequencesBrutes: string, erreurs: string[], sousConsequences: boolean) {

    // les conséquences sont séparées par des ";"
    // les sous-conséquences sont séparées par des ","
    const consBru = consequencesBrutes.split((sousConsequences ? ',' : ';'));
    let instructions: Instruction[] = [];
    consBru.forEach(conBru => {
      let conBruNettoyee = conBru
        .trim()
        // convertir marque commentaire
        .replace(this.xCaractereDebutCommentaire, ' "')
        .replace(this.xCaractereFinCommentaire, '" ');
      // enlever le point final (ou le ; final pour les sous-conséquences)
      if (conBruNettoyee.endsWith((sousConsequences ? ';' : '.'))) {
        conBruNettoyee = conBruNettoyee.slice(0, conBruNettoyee.length - 1);
      }
      // cas A: instruction simple
      const els = PhraseUtils.decomposerInstruction(conBruNettoyee);
      if (els) {
        if (els.complement) {
          els.complement = els.complement.replace(this.xCaractereRetourLigne, ' ');
        }
        instructions.push(new Instruction(els));
        // cas B: instruction conditionnelle
      } else {
        let resultSiCondCons = PhraseUtils.xSeparerSiConditionConsequences.exec(conBruNettoyee);
        if (resultSiCondCons && !sousConsequences) {
          const condition = Compilateur.getCondition(resultSiCondCons[1]);
          const consequences = Compilateur.separerConsequences(resultSiCondCons[2], erreurs, true);

          instructions.push(new Instruction(null, condition, consequences, null));

          // pas compris
        } else {
          erreurs.push("conséquence : " + conBruNettoyee);
        }
      }
    });
    return instructions;
  }

  private static testerRefuser(complement: string, phrase: Phrase, erreurs: string[]) {
    let verification: Verification[] = [];

    // séparer les conditions avec le ";"
    const conditions = complement.split(';');

    conditions.forEach(cond => {
      let result = Compilateur.rRefuser.exec(cond.trim());
      if (result) {
        const typeRefuser = result[1]; // si uniquement pour l'instant
        const condition = Compilateur.getCondition(result[2]);
        if (!condition) {
          erreurs.push(("00000" + phrase.ligne).slice(-5) + " : condition : " + result[2]);
        }
        const consequences = Compilateur.separerConsequences(result[3], erreurs, false);
        verification.push(new Verification([condition], consequences));
      } else {
        console.error("testerRefuser: format pas reconu:", cond);
        erreurs.push(("00000" + phrase.ligne).slice(-5) + " : refuser : " + cond);
      }
    });

    return verification;
  }

  private static testerRegle(regles: Regle[], phrase: Phrase, erreurs: string[]) {
    let result = Compilateur.rAvantApresRemplacerSi.exec(phrase.phrase[0]);

    if (result !== null) {

      let typeRegle: TypeRegle;
      let motCle = result[1].toLowerCase();
      switch (motCle) {
        case 'quand':
        case 'si':
        case 'avant':
        case 'après':
        case 'remplacer':
          typeRegle = TypeRegle[motCle];
          break;

        default:
          console.error("tester regle: opérateur inconnu:", result[1]);
          typeRegle = TypeRegle.inconnu;
          break;
      }

      const condition = Compilateur.getCondition(result[2]);

      if (!condition) {
        erreurs.push(("00000" + phrase.ligne).slice(-5) + " : condition : " + result[2]);
      }

      let regle = new Regle(typeRegle, condition, result[3]);
      regles.push(regle);

      // si phrase morcelée, rassembler les morceaux
      if (phrase.phrase.length > 1) {
        for (let index = 1; index < phrase.phrase.length; index++) {
          regle.consequencesBrutes += phrase.phrase[index];
        }
      }

      if (Compilateur.verbeux) {
        console.log("Règle:", regle);
      }

      return true; // trouvé un résultat
    } else {
      return false; // rien trouvé
    }
  }

  private static getCondition(condition: string) {

    // TODO: regarder les ET et les OU
    // TODO: regarder les ()
    // TODO: priorité des oppérateurs
    const els = PhraseUtils.decomposerCondition(condition);
    console.warn("getCondition:", condition, "els:", els);
    if (els) {
      return new Condition(LienCondition.aucun, els.sujet, els.verbe, els.negation, els.complement);
    } else {
      return null;
    }
  }

  /**
   * Rechercher une description d’action
   * @param actions 
   * @param phrase 
   * @param erreurs 
   */
  private static testerAction(actions: Action[], phrase: Phrase, erreurs: string[]) {
    let result = Compilateur.xAction.exec(phrase.phrase[0]);
    if (result !== null) {
      let verbe = result[1].toLocaleLowerCase();
      let ceci = result[2] === 'ceci';
      let cela = result[3] === 'cela';
      let action = new Action(verbe, ceci, cela);
      // concerne un élément ?
      if (ceci) {
        action.cibleCeci = new GroupeNominal(result[4], result[5], result[6]);
        // concerne également un 2e élément ?
        if (cela) {
          if (result[4] === 'deux') {
            action.cibleCela = new GroupeNominal(result[4], result[5], result[6]);
          } else {
            action.cibleCela = new GroupeNominal(result[7], result[8], result[9]);
          }
        }
      }
      if (Compilateur.verbeux) {
        console.log("Action:", action);
      }
      actions.push(action);

      return true; // trouvé un résultat (action)
    } else {
      let resultDescriptionAction = Compilateur.xDescriptionAction.exec(phrase.phrase[0]);
      console.log("testerDescriptionAction >>>>", phrase.phrase, " => ", resultDescriptionAction);
      if (resultDescriptionAction) {
        const motCle = resultDescriptionAction[1].toLocaleLowerCase();
        const verbe = resultDescriptionAction[2].toLocaleLowerCase();
        const ceci = resultDescriptionAction[3] == 'ceci';
        const cela = resultDescriptionAction[4] == 'cela';

        let complement = resultDescriptionAction[5];

        // si phrase morcelée, rassembler les morceaux
        if (phrase.phrase.length > 1) {
          for (let index = 1; index < phrase.phrase.length; index++) {
            complement += phrase.phrase[index];
          }
        }

        complement = complement.trim();
        // retrouver l'action correspondante
        let action = actions.find(x => x.verbe === verbe && x.ceci == ceci && x.cela == cela);
        if (action) {
          switch (motCle) {
            case 'refuser':
              action.verificationsBrutes = complement;
              action.verifications = this.testerRefuser(complement, phrase, erreurs);
              break;
            case 'exécuter':
              action.instructionsBrutes = complement;
              action.instructions = Compilateur.separerConsequences(complement, erreurs, false);
              break;
            case 'finaliser':
              action.instructionsFinalesBrutes = complement;
              action.instructionsFinales = Compilateur.separerConsequences(complement, erreurs, false);
              break;

            default:
              console.error("xDescriptionAction >>> motCle pas gérée:", motCle);
              break;
          }

        } else {
          if (this.verbeux) {
            console.error("Action pas trouvée: verbe:", verbe, "ceci:", ceci, "cela:", cela);
          }
          erreurs.push(("0000" + phrase.ligne).slice(-5) + " : action pas trouvée : " + phrase.phrase);
        }

        console.log("action màj:", action);


        return true; // trouvé un résultat (description action)
      } else {
        let resultActionSimple = this.xActionSimple.exec(phrase.phrase[0]);
        // Trouvé action simple
        if (resultActionSimple) {
          let verbe = resultActionSimple[1].toLocaleLowerCase();
          let ceci = resultActionSimple[3] !== null;
          let complement = resultActionSimple[5];

          // si phrase morcelée, rassembler les morceaux
          if (phrase.phrase.length > 1) {
            for (let index = 1; index < phrase.phrase.length; index++) {
              complement += phrase.phrase[index];
            }
          }

          let action = new Action(verbe, ceci, false);
          if (ceci) {
            action.cibleCeci = new GroupeNominal(resultActionSimple[2], resultActionSimple[3], resultActionSimple[4]);
          }

          action.instructions = Compilateur.separerConsequences(complement, erreurs, false);

          actions.push(action);
          return true; // trouvé un résultat (action simple)
        } else {
          return false; // rien trouvé
        }
      }
    }
  }

  // Élement simple non positionné
  private static testerElementSimple(dictionnaire: Map<string, Definition>, elementsGeneriques: ElementGenerique[], phrase: Phrase): ElementGenerique {
    let nouvelElementGenerique: ElementGenerique = null;
    let elementConcerne: ElementGenerique = null;

    let determinant: string;
    let nom: string;
    let intituleType: string;
    let type: TypeElement;
    let genre: Genre;
    let attributsString: string;
    let attributs: string[];
    let nombre: Nombre;
    let quantite: number;
    let position: PositionSujetString;

    // élément générique simple avec type d'élément (ex: le champignon est un décor)
    let result = Compilateur.xDefinitionTypeElement.exec(phrase.phrase[0]);
    if (result !== null) {

      console.log("testerElementSimple >>> result=", result);

      let genreSingPlur = result[3];
      let estFeminin = false;
      let autreForme: string = null;
      if (genreSingPlur) {
        // retirer parenthèses
        genreSingPlur = genreSingPlur.slice(1, genreSingPlur.length - 1);
        // séparer les arguments sur la virgule
        const argSupp = genreSingPlur.split(',');
        // le premier argument est le signe féminin
        if (argSupp[0].trim() == 'f') {
          estFeminin = true;
          // le premier argument est l'autre forme (singulier ou pluriel)
        } else {
          autreForme = argSupp[0].trim();
        }
        // s'il y a 2 arguments
        if (argSupp.length > 1) {
          // le 2e argument est le signe féminin
          if (argSupp[1].trim() == 'f') {
            estFeminin = true;
            // le 2e argument est l'autre forme (singulier ou pluriel)
          } else {
            autreForme = argSupp[1].trim();
          }
        }
      }


      determinant = result[1] ? result[1].toLowerCase() : null;
      nom = result[2];
      intituleType = result[4];
      type = Compilateur.getTypeElement(result[4]);
      genre = Compilateur.getGenre(result[1], estFeminin);
      nombre = Compilateur.getNombre(result[1]);
      quantite = Compilateur.getQuantite(result[1]);
      attributsString = result[5];
      attributs = Compilateur.getAttributs(attributsString);
      position = null;

      Compilateur.addOrUpdDefinition(dictionnaire, nom, nombre, intituleType, attributs);

      nouvelElementGenerique = new ElementGenerique(
        determinant,
        nom,
        intituleType,
        type,
        position,
        genre,
        nombre,
        quantite,
        attributs,
      );

      if (autreForme) {
        if (nouvelElementGenerique.nombre == Nombre.s) {
          nouvelElementGenerique.nomP = autreForme;
        } else {
          nouvelElementGenerique.nomS = autreForme;
        }
      }

    } else {
      // élément simple avec attributs (ex: le champignon est brun et on peut le cueillir)
      result = Compilateur.xElementSimpleAttribut.exec(phrase.phrase[0]);
      if (result != null) {

        let genreSingPlur = result[3];
        let estFeminin = false;
        let autreForme: string = null;
        if (genreSingPlur) {
          // retirer parenthèses
          genreSingPlur = genreSingPlur.slice(1, genreSingPlur.length - 1);
          // séparer les arguments sur la virgule
          const argSupp = genreSingPlur.split(',');
          // le premier argument est le signe féminin
          if (argSupp[0].trim() == 'f') {
            estFeminin = true;
            // le premier argument est l'autre forme (singulier ou pluriel)
          } else {
            autreForme = argSupp[0].trim();
          }
          // s'il y a 2 arguments
          if (argSupp.length > 1) {
            // le 2e argument est le signe féminin
            if (argSupp[1].trim() == 'f') {
              estFeminin = true;
              // le 2e argument est l'autre forme (singulier ou pluriel)
            } else {
              autreForme = argSupp[1].trim();
            }
          }
        }

        // attributs ?
        let attributs = null;
        if (result[4] && result[4].trim() !== '') {
          // découper les attributs qui sont séparés par des ', ' ou ' et '
          attributs = Compilateur.getAttributs(result[4]);
        }
        nouvelElementGenerique = new ElementGenerique(
          result[1] ? result[1].toLowerCase() : null,
          result[2],
          "",
          TypeElement.aucun,
          null,
          Compilateur.getGenre(result[1], estFeminin),
          Compilateur.getNombre(result[1]),
          Compilateur.getQuantite(result[1]),
          (attributs ? attributs : new Array<string>()),
        );

        if (autreForme) {
          if (nouvelElementGenerique.nombre == Nombre.s) {
            nouvelElementGenerique.nomP = autreForme;
          } else {
            nouvelElementGenerique.nomS = autreForme;
          }
        }
      }
    }

    // s'il y a un résultat
    if (nouvelElementGenerique) {

      // normalement l’élément concerné est le nouvel élément
      elementConcerne = nouvelElementGenerique;

      // avant d'ajouter l'élément vérifier s'il existe déjà
      let filtered = elementsGeneriques.filter(x => x.nom === nouvelElementGenerique.nom);
      if (filtered.length > 0) {
        // mettre à jour l'élément existant le plus récent.
        let elementGeneriqueTrouve = filtered[filtered.length - 1];
        // l’élément concerné est en fait l’élément retrouvé
        elementConcerne = elementGeneriqueTrouve;

        // - type d'élément
        if (nouvelElementGenerique.type !== TypeElement.aucun) {
          // s'il y avait déjà un type défini, c'est un autre élément donc finalement on va quand même l’ajouter
          if (elementGeneriqueTrouve.type !== TypeElement.aucun) {
            elementsGeneriques.push(nouvelElementGenerique);
            // finalement c’est le nouvel élément qui est concerné
            elementConcerne = nouvelElementGenerique;
          } else {
            // sinon, mettre à jour le type de l’élément retrouvé
            elementGeneriqueTrouve.type = nouvelElementGenerique.type;
          }
        }
        // - attributs

        if (this.verbeux) {
          console.log("e:", nouvelElementGenerique);
          console.log("found.attributs:", elementGeneriqueTrouve.attributs);
        }

        if (elementConcerne == elementGeneriqueTrouve && nouvelElementGenerique.attributs.length > 0) {
          elementGeneriqueTrouve.attributs = elementGeneriqueTrouve.attributs.concat(nouvelElementGenerique.attributs);
        }
      } else {
        // ajouter le nouvel élément
        elementsGeneriques.push(nouvelElementGenerique);
      }
    }
    return elementConcerne;
  }

  private static addOrUpdDefinition(dictionnaire: Map<string, Definition>, intitule: string, nombre: Nombre, typeParent: string, attributs: string[]) {
    // mise à jour
    if (dictionnaire.has(intitule)) {
      let found = dictionnaire.get(intitule);
      found.typeParent = typeParent;
      found.attributs.concat(attributs);
      // ajout
    } else {
      const definition = new Definition(intitule, typeParent, nombre, attributs);
      dictionnaire.set(intitule, definition)
    }
  }



  // Élement positionné
  private static testerPosition(elementsGeneriques: ElementGenerique[], phrase: Phrase): ElementGenerique {

    // nouvel élément (sera éventuellement pas ajouté si on se rend compte qu’on fait référence à un élément existant)
    let newElementGenerique: ElementGenerique = null;
    // élément concerné
    let elementConcerne: ElementGenerique = null;

    let determinant: string;
    let nom: string;
    let intituleType: string;
    let type: TypeElement;
    let genre: Genre;
    let genreString: string;
    let attributsString: string;
    let attributs: string[];
    let nombre: Nombre;
    let position: PositionSujetString;

    // élément positionné défini (la, le, les)
    let result = Compilateur.xPositionElementGeneriqueDefini.exec(phrase.phrase[0]);
    if (result !== null) {

      console.log("testerPosition >>>>> ", result);


      let genreSingPlur = result[3];
      let estFeminin = false;
      let autreForme: string = null;
      if (genreSingPlur) {
        // retirer parenthèses
        genreSingPlur = genreSingPlur.slice(1, genreSingPlur.length - 1);
        // séparer les arguments sur la virgule
        const argSupp = genreSingPlur.split(',');
        // le premier argument est le signe féminin
        if (argSupp[0].trim() == 'f') {
          estFeminin = true;
          // le premier argument est l'autre forme (singulier ou pluriel)
        } else {
          autreForme = argSupp[0].trim();
        }
        // s'il y a 2 arguments
        if (argSupp.length > 1) {
          // le 2e argument est le signe féminin
          if (argSupp[1].trim() == 'f') {
            estFeminin = true;
            // le 2e argument est l'autre forme (singulier ou pluriel)
          } else {
            autreForme = argSupp[1].trim();
          }
        }
      }

      newElementGenerique = new ElementGenerique(
        result[1] ? result[1].toLowerCase() : null,
        result[2],
        result[4],
        Compilateur.getTypeElement(result[4]),
        new PositionSujetString(result[2], result[7], result[6]),
        Compilateur.getGenre(result[1], estFeminin),
        Compilateur.getNombre(result[1]),
        Compilateur.getQuantite(result[1]),
        (result[5] ? new Array<string>(result[5]) : new Array<string>()),
      );

      if (autreForme) {
        if (newElementGenerique.nombre == Nombre.s) {
          newElementGenerique.nomP = autreForme;
        } else {
          newElementGenerique.nomS = autreForme;
        }
      }

      // élément positionné avec "un/une xxxx est" soit "il y a un/une xxxx"
    } else {
      result = Compilateur.xPositionElementGeneriqueIndefini.exec(phrase.phrase[0]);

      if (result != null) {
        // selon le type de résultat ("il y a un xxx" ou "un xxx est")
        let offset = result[1] ? 0 : 4;
        determinant = result[1 + offset] ? result[1 + offset].toLowerCase() : null;
        nombre = Compilateur.getNombre(result[1 + offset]);
        intituleType = result[2 + offset];
        type = Compilateur.getTypeElement(intituleType);
        genreString = result[4 + offset];
        attributsString = result[3 + offset];
        // si la valeur d'attribut est entre parenthèses, ce n'est pas un attribut
        // mais une indication de genre et/ou singulier/pluriel.
        let estFeminin = false;
        let autreForme: string = null;
        if (attributsString && attributsString.startsWith('(') && attributsString.endsWith(')')) {
          let genreSingPlur = attributsString;
          attributsString = '';
          if (genreSingPlur) {
            // retirer parenthèses
            genreSingPlur = genreSingPlur.slice(1, genreSingPlur.length - 1);
            // séparer les arguments sur la virgule
            const argSupp = genreSingPlur.split(',');
            // le premier argument est le signe féminin
            if (argSupp[0].trim() == 'f') {
              estFeminin = true;
              // le premier argument est l'autre forme (singulier ou pluriel)
            } else {
              autreForme = argSupp[0].trim();
            }
            // s'il y a 2 arguments
            if (argSupp.length > 1) {
              // le 2e argument est le signe féminin
              if (argSupp[1].trim() == 'f') {
                estFeminin = true;
                // le 2e argument est l'autre forme (singulier ou pluriel)
              } else {
                autreForme = argSupp[1].trim();
              }
            }
          }
        }

        genre = Compilateur.getGenre(determinant, estFeminin);
        // retrouver les attributs
        attributs = Compilateur.getAttributs(attributsString);

        // s'il y a des attributs, prendre uniquement le 1er pour le nom
        if (attributs.length > 0) {
          nom = result[2 + offset] + " " + attributs[0];
        } else {
          nom = result[2 + offset];
        }
        position = new PositionSujetString(result[2], result[10], result[9]);

        newElementGenerique = new ElementGenerique(
          determinant,
          nom,
          intituleType,
          type,
          position,
          genre,
          nombre,
          Compilateur.getQuantite(determinant),
          attributs,
        );

        if (autreForme) {
          if (newElementGenerique.nombre == Nombre.s) {
            newElementGenerique.nomP = autreForme;
          } else {
            newElementGenerique.nomS = autreForme;
          }
        }
      }

    }
    // s'il y a un résultat, l'ajouter
    if (newElementGenerique) {

      // normalement l’élément concerné est le nouveau
      elementConcerne = newElementGenerique;

      // avant d'ajouter l'élément vérifier s'il existe déjà
      let filtered = elementsGeneriques.filter(x => x.nom === newElementGenerique.nom);
      if (filtered.length > 0) {
        // mettre à jour l'élément existant le plus récent.
        let elementGeneriqueFound = filtered[filtered.length - 1];
        // finalement l’élément concerné est l’élément trouvé
        elementConcerne = elementGeneriqueFound;
        // - position
        if (newElementGenerique.positionString) {
          // s'il y avait déjà une position définie, c'est un autre élément, donc on ajoute quand même le nouveau !
          if (elementGeneriqueFound.positionString) {
            elementsGeneriques.push(newElementGenerique);
            elementConcerne = newElementGenerique;
          } else {
            // sinon, ajouter la position à l’élément trouvé
            elementGeneriqueFound.positionString = newElementGenerique.positionString;
          }
        }

        // - màj attributs de l’élément trouvé
        if ((elementConcerne == elementGeneriqueFound) && newElementGenerique.attributs.length > 0) {
          elementConcerne.attributs = elementGeneriqueFound.attributs.concat(newElementGenerique.attributs);
        }
        // - màj type élément de l’élément trouvé
        if ((elementConcerne == elementGeneriqueFound) && newElementGenerique.type !== TypeElement.inconnu && newElementGenerique.type !== TypeElement.aucun) {
          elementConcerne.type = newElementGenerique.type;
        }

      } else {
        // ajouter le nouvel élément
        elementsGeneriques.push(newElementGenerique);
      }

    }
    return elementConcerne;
  }



  private static getTypeElement(typeElement: string): TypeElement {
    let retVal = TypeElement.aucun;

    if (typeElement) {
      switch (typeElement.trim().toLocaleLowerCase()) {
        case "animal":
        case "animaux":
          retVal = TypeElement.animal;
          break;
        case "clé":
        case "cle":
        case "clef":
        case "clefs":
        case "clés":
        case "cles":
          retVal = TypeElement.cle;
          break;
        case "contenant":
        case "contenants":
          retVal = TypeElement.contenant;
          break;
        case "support":
        case "supports":
          retVal = TypeElement.support;
          break;
        case "décors":
        case "décor":
        case "decor":
        case "decors":
          retVal = TypeElement.decor;
          break;
        case "humain":
        case "humains":
          retVal = TypeElement.humain;
          break;
        case "objet":
        case "objets":
          retVal = TypeElement.objet;
          break;
        case "porte":
        case "portes":
          retVal = TypeElement.porte;
          break;
        case "salle":
        case "lieu":
        case "endroit":
          retVal = TypeElement.salle;
          break;

        case "joueur":
          retVal = TypeElement.joueur;
          break;

        default:
          retVal = TypeElement.inconnu;
          break;
      }
    }
    return retVal;
  }

  private static getNombre(determinant: string) {
    let retVal = Nombre.s;
    if (determinant) {
      switch (determinant.trim().toLocaleLowerCase()) {
        case "le":
        case "la":
        case "l'":
        case "1":
        case "un":
        case "une":
          retVal = Nombre.s;
          break;
        case "les":
        case "des":
        case "deux":
        case "trois":
          retVal = Nombre.p;
          break;
        case "du":
        case "de la":
        case "de l'":
          retVal = Nombre.i;
          break;

        default:
          if (this.xNombrePluriel.exec(determinant.trim()) !== null) {
            retVal = Nombre.p;
          } else {
            retVal = Nombre.s;
          }
          break;
      }
    }
    return retVal;
  }

  private static getQuantite(determinant: string): number {
    let retVal = 0;
    if (determinant) {
      switch (determinant.trim().toLocaleLowerCase()) {
        case "le":
        case "la":
        case "l'":
        case "l’":
        case "1":
        case "un":
        case "une":
          retVal = 1;
          break;
        case "deux":
          retVal = 2;
          break;
        case "trois":
          retVal = 3;
          break;
        case "les":
        case "des":
          retVal = -1;
          break;
        case "du":
        case "de la":
        case "de l'":
        case "de l’":
          retVal = -1;
          break;

        default:
          if (this.xNombrePluriel.exec(determinant.trim()) !== null) {
            retVal = +(determinant.trim());
          } else {
            retVal = 0;
          }
          break;
      }
    }
    return retVal;
  }

  /** Obtenir une liste d'attributs sur base d'une châine d'attributs séparés par des "," et un "et" */
  private static getAttributs(attributsString: string): string[] {
    if (attributsString && attributsString.trim() !== '') {
      // découper les attributs qui sont séparés par des ', ' ou ' et '
      return attributsString.trim().split(/(?:, | et )+/);
    } else {
      return new Array<string>();
    }
  }

  /** Obtenir le genre d'un élément du donjon. */
  private static getGenre(determinant: string, feminin: boolean): Genre {
    let retVal = Genre.n;


    if (determinant) {
      switch (determinant.trim().toLocaleLowerCase()) {
        case "le":
        case "il":
        case "ils":
        case "un":
          retVal = Genre.m;
          break;
        case "la":
        case "elle":
        case "elles":
        case "une":

          retVal = Genre.f;
          break;

        default:
          if (feminin) {
            retVal = Genre.f;
          } else {
            retVal = Genre.m;
          }
          break;
      }
    }
    return retVal;
  }

}
