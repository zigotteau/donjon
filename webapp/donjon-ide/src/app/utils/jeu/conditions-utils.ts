import { Classe, EClasseRacine } from '../../models/commun/classe';

import { Condition } from '../../models/compilateur/condition';
import { ElementJeu } from '../../models/jeu/element-jeu';
import { ElementsJeuUtils } from '../commun/elements-jeu-utils';
import { Jeu } from '../../models/jeu/jeu';
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

  conditionsRemplies(conditions: Condition[], ceci: ElementJeu, cela: ElementJeu) {
    if (conditions.length === 0) {
      console.warn("conditions-utils > conditionsRemplies: aucune condition à vérier.", conditions);
      return true;
    } else if (conditions.length === 1) {
      // console.warn("conditions-utils > conditionsRemplies: à vérifier…", conditions);
      const curCondition = conditions[0];
      let resultCondition = false;
      if (curCondition.verbe === 'est') {
        if (curCondition.sujet.nom === 'ceci') {
          resultCondition = this.verifierConditionElementJeuEst(curCondition, ceci);
        } else if (curCondition.sujet.nom === 'cela') {
          resultCondition = this.verifierConditionElementJeuEst(curCondition, cela);
        } else {
          console.error("conditionsRemplies: sujet pas supporté:", curCondition.sujet);
        }
        console.error("conditionsRemplies >>>> resultat:", resultCondition);
        return resultCondition;
      } else {
        console.error("conditionsRemplies: verbe pas supporté:", curCondition.verbe);
        return false;
      }
    } else {
      console.error("conditions-utils > conditionsRemplies: ne gère pas encore plusieurs conditions.", conditions);
      return false;
    }
  }

  private verifierConditionElementJeuEst(cond: Condition, el: ElementJeu) {
    let resultCondition = null;
    if (!cond.sujetComplement || !cond.sujetComplement.determinant) {
      // s’il s’agit d’un objet, on vérifier d’abord les attributs
      if (Classe.heriteDe(el.classe, EClasseRacine.objet)) {
        const obj = el as Objet;
        // attributs spécifiques aux objets
        // - possede
        if (cond.complement.startsWith('possédé')) {
          resultCondition = obj.possede;
        } else if (cond.complement.startsWith('visible')) {
          resultCondition = obj.visible;
        }
      }
      // si pas un objet ou pas un attribut spécifique, vérifier la liste des états
      if (resultCondition === null) {
        resultCondition = ElementsJeuUtils.possedeCetEtat(el, cond.complement);
      }

    } else {
      switch (cond.sujetComplement.determinant) {
        case "un ":
        case "une ":
        case "des ":
        case "de la ":
        case "du ":
        case "de l’":
        case "de l'":
          resultCondition = Classe.heriteDe(el.classe, cond.sujetComplement.nom);
          console.log("resultCondition=", resultCondition, "el.classe=", el.classe, "sujetComp.nom=", cond.sujetComplement.nom);
          break;

        case "la ":
        case "le ":
        case "l’":
        case "l'":
        case "les ":
          resultCondition = (el.intitule.nom === cond.sujetComplement.nom);
          break;

        default:
          console.error("verifierConditionElementJeuEst : déterminant pas géré:", cond.sujetComplement.determinant);
          resultCondition = false;
          break;
      }
    }

    // négation de la condition ?
    if (resultCondition !== null && cond.negation) {
      resultCondition = !resultCondition;
    }

    return resultCondition;

  }

  siEstVrai(conditionString: string, condition: Condition, ceci: ElementJeu, cela: ElementJeu) {
    let retVal = false;
    if (condition == null) {
      condition = PhraseUtils.getCondition(conditionString);
    }
    if (condition) {

      // 1 - Trouver le sujet
      // ++++++++++++++++++++
      let sujet: ElementJeu = null;

      if (condition.sujet) {
        if (condition.sujet.nom === 'ceci') {
          sujet = ceci;
        } else if (condition.sujet.nom === 'cela') {
          sujet = cela;
        } else {
          const correspondances = this.eju.trouverCorrespondance(condition.sujet);
          if (correspondances.elements.length == 1) {
            sujet = correspondances.elements[0];
          } else if (correspondances.elements.length > 1) {
            console.error("siEstVrai >>> plusieurs éléments trouvés pour le sujet:", condition.sujet, condition);
          } else {
            console.error("siEstVrai >>> pas d’élément trouvé pour pour le sujet:", condition.sujet, condition);
          }
        }
      }


      if (sujet) {

        // 2 - Trouver le verbe
        // ++++++++++++++++++++

        switch (condition.verbe) {
          // état
          case 'est':
            // faire le test
            if (sujet) {
              retVal = ElementsJeuUtils.possedeCetEtat(sujet, condition.complement);
            }
            break;

          case 'contient':
            if (condition.complement === 'un objet') {
              retVal = this.eju.verifierContientObjet(sujet);
            } else {
              console.error("siEstVrai > condition « contient » pas encore gérée pour le complément ", condition.complement);
            }
            break;

          case 'aucun': // forme "aucun xxxx pour yyyy"
            if (condition.complement === 'description') {
              retVal = (!sujet.description);
            } else if (condition.complement === 'examen') {
              retVal = (!sujet.examen);
            } else {
              console.error("siEstVrai > condition « aucun » pas encore gérée pour le complément ", condition.complement);
            }
            break;

          case 'possède':
            console.error("siEstVrai > condition « possède » pas encore gérée.");
            break;

          case 'se trouve':
          case 'se trouvent':

            // trouver l'objet
            let trouvailles = this.eju.trouverObjet(condition.sujet);

            if (trouvailles.length > 0) {
              const curLieu = this.eju.getLieuObjet(this.jeu.joueur);
              trouvailles.forEach(el => {
                if (this.eju.getLieuObjet(el) === curLieu) {
                  retVal = true;
                }
              });
            }

            // // vérifier si un élément est présent à l’endroit indiqué
            // // (pour l’instant seul « ici » est géré.)
            // const objetsTrouves = this.eju.getObjetsQuiSeTrouventLa(condition.complement);

            // console.log("siEstVrai >> se trouve >> objetsTrouves=", objetsTrouves);

            // // singulier
            // if (condition.verbe.endsWith('e')) {
            //   objetsTrouves.forEach(obj => {
            //     if (obj.intituleS.nom === condition.sujet.nom && (!condition.sujet.epithete || condition.sujet.epithete === obj.intituleS.epithete)) {
            //       retVal = true;
            //     }
            //   });
            //   // pluriel
            // } else {
            //   objetsTrouves.forEach(obj => {
            //     if (obj.intituleP.nom === condition.sujet.nom && (!condition.sujet.epithete || condition.sujet.epithete === obj.intituleP.epithete)) {
            //       retVal = true;
            //     }
            //   });
            // }

            break;

          default:
            console.error("siEstVrai: verbe pas connu::", condition.verbe);
            break;
        }

        // pas de sujet
      } else {
        console.error("Condition sans sujet pas gérée:", condition);

      }

    } else {
      console.error("siEstVrai: condition pas comprise:", condition);
    }

    console.info("siEstVrai: ", condition, retVal);

    return retVal;
  }



}