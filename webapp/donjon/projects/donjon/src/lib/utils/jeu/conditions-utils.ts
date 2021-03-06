import { Condition, LienCondition } from '../../models/compilateur/condition';
import { EClasseRacine, EEtatsBase } from '../../models/commun/constantes';
import { ELocalisation, Localisation } from '../../models/jeu/localisation';

import { ClasseUtils } from '../commun/classe-utils';
import { Compteur } from '../../models/compilateur/compteur';
import { CompteursUtils } from './compteurs-utils';
import { ElementJeu } from '../../models/jeu/element-jeu';
import { ElementsJeuUtils } from '../commun/elements-jeu-utils';
import { Evenement } from '../../models/jouer/evenement';
import { GroupeNominal } from '../../models/commun/groupe-nominal';
import { Intitule } from '../../models/jeu/intitule';
import { Jeu } from '../../models/jeu/jeu';
import { Lieu } from '../../models/jeu/lieu';
import { Objet } from '../../models/jeu/objet';
import { PhraseUtils } from '../commun/phrase-utils';

export class ConditionsUtils {

  constructor(
    private jeu: Jeu,
    private verbeux: boolean,
  ) {
    this.eju = new ElementsJeuUtils(jeu, verbeux);
  }

  /** Utilitaires - Éléments du jeu */
  private eju: ElementsJeuUtils;



  /**
   * Vérifier la condition ainsi que les liens.
   */
  siEstVraiAvecLiens(conditionString: string, condition: Condition, ceci: ElementJeu | Intitule, cela: ElementJeu | Intitule, evenement: Evenement, declenchements: number) {

    const resultConditionA = this.siEstVraiSansLien(conditionString, condition, ceci, cela, evenement, declenchements);
    let resultConditionB: boolean = null;
    let resultConditionC: boolean = null;
    let resultConditionD: boolean = null;
    let resultFinal = resultConditionA;
    // une 2e condition est liée
    if (condition.lien) {
      switch (condition.lien.typeLien) {
        // ET
        case LienCondition.et:
          // si c’est un ET et que la première condition est vraie, tester la 2e
          if (resultFinal === true) {
            resultFinal = this.siEstVraiSansLien(conditionString, condition.lien, ceci, cela, evenement, declenchements);
            // si les 2 premières conditions sont vraies, tester la 3e
            if (condition.lien.lien && resultFinal === true) {
              resultFinal = this.siEstVraiSansLien(conditionString, condition.lien.lien, ceci, cela, evenement, declenchements);
              // si les 3 premières conditions sont vraies, tester la 4e
              if (condition.lien.lien.lien && resultFinal === true) {
                resultFinal = this.siEstVraiSansLien(conditionString, condition.lien.lien.lien, ceci, cela, evenement, declenchements);
              }
            }
          }
          break;
        // OU
        case LienCondition.ou:
          // si c’est un OU et que la premièr condition est fausse, tester la 2e
          if (resultConditionA !== true) {
            resultFinal = this.siEstVraiSansLien(conditionString, condition.lien, ceci, cela, evenement, declenchements);
            // si les 2 premières conditions sont fausses, tester la 3e
            if (condition.lien.lien && resultFinal !== true) {
              resultFinal = this.siEstVraiSansLien(conditionString, condition.lien.lien, ceci, cela, evenement, declenchements);
              // si les 3 premières conditions sont fausses, tester la 4e
              if (condition.lien.lien.lien && resultFinal !== true) {
                resultFinal = this.siEstVraiSansLien(conditionString, condition.lien.lien.lien, ceci, cela, evenement, declenchements);
              }
            }
          }
          break;
        // SOIT
        case LienCondition.soit:
          let nbVraiSoit = resultConditionA ? 1 : 0;
          // si c’est un SOIT, tester la 2e
          resultConditionB = this.siEstVraiSansLien(conditionString, condition.lien, ceci, cela, evenement, declenchements);
          nbVraiSoit += resultConditionB ? 1 : 0;
          // tester la 3e condition (si pas encore sûr que c’est faux)
          if (nbVraiSoit < 2 && condition.lien.lien) {
            // le résultat final est vrai si la 3e condition est différente du résultat des 2 premières.
            resultConditionC = this.siEstVraiSansLien(conditionString, condition.lien.lien, ceci, cela, evenement, declenchements);
            nbVraiSoit += resultConditionC ? 1 : 0;
            // tester la 4e condition (si pas encore sûr que c’est faux)
            if (nbVraiSoit < 2 && condition.lien.lien.lien) {
              // le résultat final est vrai si la 3e condition est différente du résultat des 2 premières.
              resultConditionD = this.siEstVraiSansLien(conditionString, condition.lien.lien.lien, ceci, cela, evenement, declenchements);
              nbVraiSoit += resultConditionD ? 1 : 0;
            }
          }
          resultFinal = nbVraiSoit === 1;
          break;

        default:
          break;
      }
    }
    return resultFinal;

  }

  /**
   * Tester si la condition est vraie.
   * Remarque: le LIEN (et/ou/soit) n'est PAS TESTÉ. La méthode siEstVraiAvecLiens le fait.
   */
  public siEstVraiSansLien(conditionString: string, condition: Condition, ceci: ElementJeu | Compteur | Intitule, cela: ElementJeu | Compteur | Intitule, evenement: Evenement, declenchements: number) {
    let retVal = false;
    if (condition == null) {
      condition = PhraseUtils.getCondition(conditionString);
    }
    if (condition) {
      // condition spéciale: « historique contient "xxxxx"»
      if (condition.sujet.nom === 'historique' && condition.verbe === "contient") {
        let recherche = condition.complement?.trim().toLowerCase();
        if (recherche) {
          // ajouter les guillemets si pas présents
          if (!recherche?.startsWith('"')) {
            recherche = '"' + recherche + '"';
          }
          retVal = this.jeu.sauvegardes.includes(recherche);
        } else {
          console.error("check si l’historique contient >>> recherche vide");
        }

        // conditions normales
      } else {
        // 1 - Trouver le sujet
        // ++++++++++++++++++++
        let sujet: ElementJeu | Compteur | Intitule = null;

        if (condition.sujet) {
          // ici
          if (condition.sujet.nom === 'ici') {
            sujet = this.eju.curLieu;
          }
          // ceci
          else if (condition.sujet.nom === 'ceci') {
            sujet = ceci;
            if (!ceci) {
              console.warn("siEstVraiSansLien: le « ceci » de la condition est null.");
            }
            // cela
          } else if (condition.sujet.nom === 'cela') {
            sujet = cela;
            if (!cela) {
              console.warn("siEstVraiSansLien: le « cela » de la condition est null.");
            }
            // quantitéCeci
          } else if (condition.sujet.nom === 'quantitéCeci') {
            const cpt = new Compteur("quantitéCeci", evenement.quantiteCeci);
            sujet = cpt;
            if (!ceci) {
              console.warn("siEstVraiSansLien: quantitéCeci: le « ceci » de la condition est null.");
            }
            // quantitéCela
          } else if (condition.sujet.nom === 'quantitéCela') {
            const cpt = new Compteur("quantitéCela", evenement.quantiteCela);
            sujet = cpt;
            if (!cela) {
              console.warn("siEstVraiSansLien: quantitéCela: le « cela » de la condition est null.");
            }
            // quantité de ceci
          } else if (condition.sujet.nom === 'quantité de ceci') {
            if (!ceci || !ClasseUtils.heriteDe(ceci.classe, EClasseRacine.element)) {
              console.warn("siEstVraiSansLien: quantité de ceci: le « ceci » de la condition est null.");
            } else {
              const cpt = new Compteur("quantité de ceci", (ceci as ElementJeu).quantite);
              sujet = cpt;
            }
            // quantité de cela
          } else if (condition.sujet.nom === 'quantité de cela') {
            if (!cela || !ClasseUtils.heriteDe(cela.classe, EClasseRacine.element)) {
              console.warn("siEstVraiSansLien: quantité de cela: le « cela » de la condition n’est pas un élément.");
            } else {
              const cpt = new Compteur("quantité de cela", (cela as ElementJeu).quantite);
              sujet = cpt;
            }
            // règle
          } else if (condition.sujet.nom === 'règle') {
            if (!declenchements) {
              console.warn("siEstVraiSansLien: règle: il ne s’agit pas d’une règle (« déclenchements » pas défini).");
            } else {
              const cpt = new Compteur("déclenchements règle", declenchements);
              sujet = cpt;
            }

            // sortie/porte vers ceci/cela
          } else if (condition.sujet.nom == "sortie vers" || condition.sujet.nom == "porte vers") {
            let locString: string = condition.sujet.epithete;
            if (condition.sujet.epithete == 'ceci') {
              locString = ceci.intitule.nom;
            } else if (condition.sujet.epithete == 'cela') {
              locString = cela.intitule.nom;
            }
            const loc = ElementsJeuUtils.trouverLocalisation(new GroupeNominal(null, locString));

            if (loc == null) {
              console.error("siEstVraiSansLien: sortie/porte vers '", sujet.intitule.nom, "': direction inconnue.");
              // regarder s'il y a une sortie dans la direction indiquée
            } else {
              if (condition.sujet.nom == "sortie vers") {
                const voisinID = this.eju.getVoisinDirectionID(loc, EClasseRacine.lieu);
                if (voisinID !== -1) {
                  sujet = this.eju.getLieu(voisinID);
                }
              } else {
                const porteID = this.eju.getVoisinDirectionID(loc, EClasseRacine.porte);
                if (porteID !== -1) {
                  sujet = this.eju.getObjet(porteID);
                }
              }
            }
          } else if (condition.sujet.nom == "porte vers") {
            retVal = false;
          } else {
            const correspondances = this.eju.trouverCorrespondance(condition.sujet, false, false);
            if (correspondances.elements.length == 1) {
              sujet = correspondances.elements[0];
            } else if (correspondances.elements.length > 1 || correspondances.compteurs.length > 1) {
              console.error("siEstVraiSansLien >>> plusieurs éléments trouvés pour le sujet:", condition.sujet, condition, correspondances);
            } else if (correspondances.compteurs.length === 1) {
              sujet = correspondances.compteurs[0];
            } else {
              console.error("siEstVraiSansLien >>> pas d’élément trouvé pour pour le sujet:", condition.sujet, condition, correspondances);
            }
          }
        }


        // *********************************************
        //  A. ÉLÉMENT DU JEU
        // *********************************************
        if (sujet && ClasseUtils.heriteDe(sujet.classe, EClasseRacine.element)) {

          // 2 - Trouver le verbe
          // ++++++++++++++++++++
          switch (condition.verbe) {
            // ÉTAT
            case 'est':
              // est une [classe] | est [état]
              // remarque: négation appliquée plus loin.
              retVal = this.verifierConditionEst(condition, (sujet as ElementJeu));
              break;

            // CONTENU
            case 'contient':
              // remarque: négation appliquée plus loin.
              if (condition.sujetComplement && condition.sujetComplement.nom === 'objet' && (condition.sujetComplement.determinant?.trim() === 'un' || condition.sujetComplement.determinant === "d'" || condition.sujetComplement.determinant === 'd’')) {
                retVal = this.eju.verifierContientObjet(sujet as ElementJeu);
              } else {
                console.error("siEstVraiSansLien > condition « contient » pas encore gérée pour le complément ", condition.complement);
              }
              break;


            // EXISTANCE
            // forme "aucun·e xxxx pour yyyy" ou "aucun·e xxx vers yyyy"
            // Ex: aucune description n’existe pour ceci. 
            // Ex: aucune sortie n’existe vers le nord.
            // Ex: un aperçu existe pour cela.
            case 'existe':
              retVal = this.verifierConditionExiste(condition, sujet, ceci);
              break;

            // ÉLÉMENT POSSÉDÉ (PAR LE JOUEUR)
            case 'possède':
              if (sujet.nom === "joueur") {
                // vérifier si l’objet cible est possédé par le joueur
                // > remarque: négation appliquée plus loin.
                const objetCible = this.trouverObjetCible(condition.complement, condition.sujetComplement, ceci, cela);
                if (objetCible) {
                  retVal = this.jeu.etats.possedeEtatIdElement(objetCible, this.jeu.etats.possedeID);
                }
                break;
              } else {
                console.error("siEstVraiSansLien > condition « possède » prise en charge uniquement pour le joueur.");
              }
              break;


            // ÉLÉMENT PORTÉ (PAR LE JOUEUR)
            case 'porte':
              if (sujet.nom.toLowerCase() === "joueur") {
                // vérifier si l’objet cible est porté par le joueur
                // > remarque: négation appliquée plus loin.
                const objetCible = this.trouverObjetCible(condition.complement, condition.sujetComplement, ceci, cela);
                if (objetCible) {
                  retVal = this.jeu.etats.possedeEtatIdElement(objetCible, this.jeu.etats.porteID);
                }
                break;
              } else {
                console.error("siEstVraiSansLien > condition « porte » prise en charge uniquement pour le joueur.", sujet.nom);
              }
              break;

            // LOCALISATION
            case 'se trouve':
            case 'se trouvent':
              // retrouver la destination
              // remarque: négation appliquée plus loin.
              let destination: ElementJeu = null;
              if (condition.sujetComplement?.nom === "ici") {
                destination = this.eju.curLieu;
              } else if (condition.sujetComplement?.nom === "ceci") {
                if (ceci && ClasseUtils.heriteDe(ceci.classe, EClasseRacine.lieu)) {
                  destination = ceci as Lieu;
                  // (la commande aller passe par ici avec une direction)
                } else if (!ceci || !ClasseUtils.heriteDe(ceci.classe, EClasseRacine.direction)) {
                  console.error("siEstVraiSansLien > condition se trouve dans ceci: ceci n’est pas un lieu ceci=", ceci);
                }
              } else if (condition.sujetComplement?.nom === "cela") {
                if (cela && ClasseUtils.heriteDe(cela.classe, EClasseRacine.lieu)) {
                  destination = ceci as Lieu;
                  // (la commande aller passe par ici avec une direction)
                } else if (!cela || !ClasseUtils.heriteDe(cela.classe, EClasseRacine.direction)) {
                  console.error("siEstVraiSansLien > condition se trouve dans cela : cela n’est pas un lieu cela=", cela);
                }
              } else {
                const correspondances = this.eju.trouverCorrespondance(condition.sujetComplement, false, false);
                if (correspondances.nbCor === 1) {
                  destination = correspondances.elements[0];
                } else if (correspondances.nbCor === 0) {
                  console.error("siEstVraiSansLien > condition se trouve: pas de correspondance trouvée pour dest=", condition.sujetComplement);
                } else if (correspondances.nbCor > 1) {
                  console.error("siEstVraiSansLien > condition se trouve: plusieurs correspondances trouvées pour dest=", condition.sujetComplement, "cor=", correspondances);
                }
              }

              // si on a trouvé la cible et la destination
              // TODO: destination pourrait être un objet !
              if (sujet && destination) {
                // vérifier que la cible se trouve au bon endroit
                if ((sujet as Objet).position.cibleId === destination.id) {
                  retVal = true;
                }
              }
              break;

            case 'réagit':
            case 'réagissent':
              // remarque: négation appliquée plus loin.
              if ((sujet as Objet).reactions && (sujet as Objet).reactions.length > 0) {
                retVal = true;
              }
              break;

            // comparaison : égalité
            case 'valent':
            case 'vaut':
              // TODO: gérer plus de situations (en test)
              // remarque: négation appliquée plus loin.
              console.warn("vaut condi=", condition, "ceci=", ceci, "cela=", cela);

              if (('"' + sujet.nom + '"') === condition.complement) {
                retVal = true;
              }
              break;

            default:
              console.error(
                "siEstVraiSansLien > Condition élément du jeu: verbe pas connu (" + condition.verbe + ").\n",
                "Les verbes connus sont : être, contenir, exister, posséder, porter, se trouver, réagir et valoir.\n",
                condition);
              break;
          }
          // *********************************************
          //  B. COMPTEUR
          // *********************************************
        } else if (sujet && ClasseUtils.heriteDe(sujet.classe, EClasseRacine.compteur)) {

          const compteur = sujet as Compteur;

          // 2 - Trouver le verbe
          // ++++++++++++++++++++
          switch (condition.verbe) {

            // comparaison : égal (vaut) − différent (ne vaut pas)
            case 'valent':
            case 'vaut':
              // remarque: négation appliquée plus loin.
              retVal = compteur.valeur === CompteursUtils.intituleValeurVersNombre(condition.complement, ceci, cela, evenement, this.eju, this.jeu);
              break;

            // comparaison: plus grand que (dépasse) - plus petit ou égal (ne dépasse pas)
            case 'dépasse':
            case 'dépassent':
              // remarque: négation appliquée plus loin.
              retVal = compteur.valeur > CompteursUtils.intituleValeurVersNombre(condition.complement, ceci, cela, evenement, this.eju, this.jeu);
              break;

            // comparaison: plus grand ou égal (atteint) − plus petit que (n’atteint pas)
            case 'atteint':
            case 'atteignent':
              // remarque: négation appliquée plus loin.
              retVal = compteur.valeur >= CompteursUtils.intituleValeurVersNombre(condition.complement, ceci, cela, evenement, this.eju, this.jeu);
              break;

            case 'se déclenche':
              if (compteur.nom === 'déclenchements règle' && condition.complement === 'pour la première fois') {
                // remarque: négation appliquée plus loin.
                retVal = (compteur.valeur === 1);
                console.log("déclenche ? :", compteur.valeur, retVal);
              } else {
                console.error("Condition compteur: déclenche: supporté seulement pour « la règle se déclenche pour la première fois.");
              }
              break;

            default:
              console.error(
                "Condition compteur: verbe pas connu (" + condition.verbe + ").\n",
                "Les verbes connus sont : valoir, déppasser et atteindre.\n",
                condition);
              break;

          }
          // *********************************************
          //  C. DIRECTION
          // *********************************************
        } else if (sujet && ClasseUtils.heriteDe(sujet.classe, EClasseRacine.direction)) {

          // 2 - Trouver le verbe
          // ++++++++++++++++++++
          switch (condition.verbe) {

            case 'est':
              // est une [classe] | est [état]
              // remarque: négation appliquée plus loin.
              retVal = this.verifierConditionEst(condition, (sujet as Intitule));
              break;

            // EXISTANCE
            // forme "aucun·e xxxx pour yyyy" ou "aucun·e xxx vers yyyy"
            // Ex: aucune description n’existe pour ceci. 
            // Ex: aucune sortie n’existe vers le nord.
            // Ex: un aperçu existe pour cela.
            case 'existe':
              retVal = this.verifierConditionExiste(condition, sujet, ceci);
              break;

            // comparaison : égalité
            case 'valent':
            case 'vaut':
              // remarque: négation appliquée plus loin.
              if (('"' + sujet.nom + '"') === condition.complement) {
                retVal = true;
              }
              break;



            default:
              console.error(
                "Condition intitulé: verbe pas connu (" + condition.verbe + ").\n",
                "Les verbes connus sont : valoir.\n",
                condition);
              break;
          }

          // *********************************************
          //  D. INTITULÉ
          // *********************************************
        } else if (sujet && ClasseUtils.heriteDe(sujet.classe, EClasseRacine.intitule)) {

          // 2 - Trouver le verbe
          // ++++++++++++++++++++
          switch (condition.verbe) {

            case 'est':
              // est une [classe] | est [état]
              // remarque: négation appliquée plus loin.
              retVal = this.verifierConditionEst(condition, (sujet as Intitule));
              break;

            // comparaison : égalité
            case 'valent':
            case 'vaut':
              // remarque: négation appliquée plus loin.
              if (('"' + sujet.nom + '"') === condition.complement) {
                retVal = true;
              }
              break;

            default:
              console.error(
                "Condition intitulé: verbe pas connu (" + condition.verbe + ").\n",
                "Les verbes connus sont : valoir.\n",
                condition);
              break;

          }
          // *********************************************
          //  D. AUCUN SUJET
          // *********************************************
        } else {
          console.error("siEstVraiSansLien > Condition sans sujet pas gérée: \nsujet:", sujet, "\ncondition:", condition);
        }
      }

    } else {
      console.error("siEstVraiSansLien > condition pas comprise:", condition);
    }

    if (this.verbeux) {
      console.log("siEstVraiSansLien > ", condition, retVal);
    }
    // prise en compte de la négation
    if (condition.negation) {
      retVal = !retVal;
    }

    // // -------------------------------------------------------
    // // DEB: Affichage détaillé de la condition et du retour
    // // -------------------------------------------------------
    // console.warn(
    //   "Condition:",
    //   "\n Suj:", ((condition.sujet?.nom ?? "") + " " + (condition.sujet?.epithete ?? "")),
    //   ((condition.sujet ? (condition.sujet.nom === 'ceci' ? ("(" + (ceci?.nom ?? '-') + ")") : '') : '') +
    //   (condition.sujet ? (condition.sujet.nom === 'cela' ? ("(" + (cela?.nom ?? '-') + ")") : '') : '') +
    //   (condition.sujet ? (condition.sujet.nom === 'ici' ? ("(" + this.eju.curLieu.nom + ")") : '') : '')),
    //   "\n Ver:", condition.verbe,
    //   "\n Neg:", (condition.negation ?? "−"),
    //   "\n Com:", ((condition.sujetComplement?.nom ?? "") + " " + (condition.sujetComplement?.epithete ?? "")),
    //   "\n >>> ", retVal);

    return retVal;
  }

  /**
   * Retrouver l’objet cible de la condition.
   * @param brute « ceci » et « cela » sont gérés.
   * @param intitule un objet à retrouver
   * @param ceci pour le cas où brute vaut « ceci ».
   * @param cela pour le cas où brute vaut « cela ».
   */
  private trouverObjetCible(brute: string, intitule: GroupeNominal, ceci: Intitule | ElementJeu, cela: Intitule | ElementJeu): Objet {
    let objetCible: Objet = null;
    // retrouver OBJET CLASSIQUE
    if (intitule) {
      const objetsTrouves = this.eju.trouverObjet(intitule, false);
      if (objetsTrouves.length == 1) {
        objetCible = objetsTrouves[0];
      } else {
        console.warn("Instructions > trouverObjetCible > plusieurs correspondances trouvées pour :", brute);
      }
      // retrouver OBJET SPÉCIAL
    } else if (brute === 'ceci') {
      if (ceci && ClasseUtils.heriteDe(ceci?.classe, EClasseRacine.objet)) {
        objetCible = ceci as Objet;
      } else {
        console.error("ConditionsUtils > trouverObjetCible > ceci n’est pas un objet.");
      }
    } else if (brute === 'cela') {
      if (cela && ClasseUtils.heriteDe(cela?.classe, EClasseRacine.objet)) {
        objetCible = cela as Objet;
      } else {
        console.error("ConditionsUtils > trouverObjetCible > cela n’est pas un objet.");
      }
    } else {
      console.error("ConditionsUtils > trouverObjetCible > objet spécial pas pris en change :", brute);
    }
    if (!objetCible) {
      console.warn("ConditionsUtils > trouverObjetCible > pas pu trouver :", brute);
    }
    return objetCible;
  }

  /** 
 * Vérifier une condition de type "est", c'est à dire vérifer l'état ou la classe.
 * /!\ La négation n'est pas appliquée ici, il faut le faire ensuite.
 */
  private verifierConditionEst(condition: Condition, sujet: ElementJeu | Intitule) {
    let resultCondition: boolean = null;

    // console.warn("@@@   cond:", cond);


    if (!condition.sujetComplement || !condition.sujetComplement.determinant) {
      // vérifier la liste des états (si c’est un élémentJeu)
      if (ClasseUtils.heriteDe(sujet.classe, EClasseRacine.element)) {
        resultCondition = this.jeu.etats.possedeEtatElement((sujet as ElementJeu), condition.complement, this.eju);
      } else {
        resultCondition = false;
      }
    } else {
      switch (condition.sujetComplement.determinant) {
        case "un ":
        case "une ":
        case "des ":
        case "de la ":
        case "du ":
        case "de l’":
        case "de l'":
          // console.log("@@@@", sujet.classe, cond.sujetComplement.nom);
          resultCondition = ClasseUtils.heriteDe(sujet.classe, condition.sujetComplement.nom);
          // console.log("resultCondition=", resultCondition, "el.classe=", sujet.classe, "sujetComp.nom=", cond.sujetComplement.nom);
          break;

        case "la ":
        case "le ":
        case "l’":
        case "l'":
        case "les ":
          // console.log("cond est sujet=", sujet, "compl=", cond.sujetComplement);
          resultCondition = (sujet.intitule.nom === condition.sujetComplement.nom) && (sujet.intitule.epithete === condition.sujetComplement.epithete);
          // si le complément est un groupe nominal, vérifier également les synonymes du sujet
          if (!resultCondition && ClasseUtils.heriteDe(sujet.classe, EClasseRacine.element)) {
            if ((sujet as ElementJeu).synonymes?.length) {
              (sujet as ElementJeu).synonymes.forEach(syn => {
                if (!resultCondition && (syn.nom === condition.sujetComplement.nom) && (syn.epithete === condition.sujetComplement.epithete)) {
                  resultCondition = true;
                }
              });
            }
          }
          break;

        default:
          console.error("verifierConditionEst : déterminant pas géré:", condition.sujetComplement.determinant);
          resultCondition = false;
          break;
      }
    }

    return resultCondition;

  }

  private verifierConditionExiste(condition: Condition, sujet: ElementJeu | Intitule, ceci: ElementJeu | Intitule) {

    let retVal = false;

    // remarque: négation appliquée plus loin.
    // A) SORTIE, PORTE
    if (condition.sujetComplement.nom === 'sortie') {
      // console.warn("Test des sorties", condition, sujet);
      // trouver direction
      let loc: Localisation | ELocalisation = null;
      // si le sujet est un lieu
      if (ClasseUtils.heriteDe(sujet.classe, EClasseRacine.lieu)) {
        // chercher la direction vers ce lieu
        let voisin = this.eju.curLieu.voisins.find(x => x.type == EClasseRacine.lieu && x.id == (sujet as Lieu).id);
        loc = voisin.localisation;
        // sinon c’est directement une direction
      } else {
        loc = ElementsJeuUtils.trouverLocalisation(sujet.intitule);
      }
      if (loc == null) {
        console.error("siEstVraiSansLien: sorties vers '", sujet.intitule.nom, "': direction inconnue.");
        // regarder s'il y a une sortie dans la direction indiquée
      } else {
        let voisinID = this.eju.getVoisinDirectionID(loc, EClasseRacine.lieu);

        // cas particulier : si le joueur utilise entrer/sortir quand une seule sortie visible, aller dans la direction de cette sortie
        if (loc instanceof Localisation && (loc.id == ELocalisation.exterieur /*|| loc.id == ELocalisation.interieur*/)) {
          const lieuxVoisinsVisibles = this.eju.getLieuxVoisinsVisibles(this.eju.curLieu);
          if (lieuxVoisinsVisibles.length == 1) {
            voisinID = lieuxVoisinsVisibles[0].id;
            loc = lieuxVoisinsVisibles[0].localisation;
          }
        }

        // Pas de voisin => aucune sortie dans cette direction
        if (voisinID == -1) {
          retVal = false;
          // voisin existe
        } else {
          // trouver si porte séparre voisin
          const porteID = this.eju.getVoisinDirectionID(loc, EClasseRacine.porte);
          // aucune porte => sortie existe et est accessible
          if (porteID == -1) {
            retVal = true;
            // une porte
          } else {
            const porte = this.eju.getObjet(porteID);
            // si on teste « existe sortie » tout court, il y a une sortie (sauf si porte invisible fermée.)
            if (!condition.sujetComplement.epithete) {
              retVal = !this.jeu.etats.possedeCesEtatsElement(porte, EEtatsBase.invisible, EEtatsBase.ferme, LienCondition.et, this.eju);
              // si on test « existe sortie accessible », il faut que la porte soit ouverte pour retourner vrai.
            } else if (condition.sujetComplement.epithete == 'accessible') {
              retVal = this.jeu.etats.possedeEtatElement(porte, EEtatsBase.ouvert, this.eju);
              // attribut pas pris en charge
            } else {
              console.error("siEstVrai sorties «", condition.sujetComplement.epithete, "» : attribut pas pris en charge.");
              retVal = false; // => pas de sortie
            }
          }
        }
      }
    } else if (condition.sujetComplement.nom === 'porte') {
      console.warn("Test des portes", condition, sujet);
      // trouver direction
      const loc = ElementsJeuUtils.trouverLocalisation(sujet.intitule);
      if (loc != null) {
        console.error("siEstVraiSansLien: porte vers '", sujet.intitule.nom, "' : direction inconnue.");
        // regarder s'il y a une porte dans la direction indiquée
      } else {
        const porteID = this.eju.getVoisinDirectionID(loc, EClasseRacine.porte);
        // aucune porte
        if (porteID == -1) {
          retVal = false;
          // la porte est invisible => aucune porte
        } else {
          const porte = this.eju.getObjet(porteID);
          retVal = !this.jeu.etats.possedeEtatIdElement(porte, this.jeu.etats.invisibleID);
        }
      }
      // B) PROPRIÉTÉ
      // aperçu
    } else if ((condition.complement === 'aperçu') || (condition.complement === 'apercu')) {
      // => aperçu dans une direction
      if (ClasseUtils.heriteDe(sujet.classe, EClasseRacine.direction)) {
        const dirCeci = ceci as Localisation;
        let voisinID = this.eju.getVoisinDirectionID(dirCeci, EClasseRacine.lieu);
        if (voisinID !== -1) {
          let voisin = this.eju.getLieu(voisinID);
          retVal = voisin.apercu ? true : false;
        } else {
          console.error("cond aperçu existe vers direction: voisin pas trouvé dans cette direction.");
        }
        // => aperçu d’un objet
      } else {
        retVal = (sujet as ElementJeu).apercu ? true : false;
      }
      // autre
    } else {
      // à moins qu’on ne trouve la propriété et une valeur, le retour vaudra false
      retVal = false;
      // parcourir les propriétés
      (sujet as ElementJeu).proprietes.forEach(propriete => {
        // si on a trouvé la propriété et qu’elle a une valeur
        if (propriete.nom.toLocaleLowerCase() === condition.complement.toLowerCase() && propriete.valeur) {
          // on a trouvé la propriété et celle-ci a une valeur
          retVal = true;
        }
      });
    }

    return retVal;
  }

}
