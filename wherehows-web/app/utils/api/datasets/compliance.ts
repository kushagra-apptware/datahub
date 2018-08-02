import { initialComplianceObjectFactory } from 'wherehows-web/constants';
import { SuggestionIntent } from 'wherehows-web/constants/datasets/compliance';
import { isNotFoundApiError } from 'wherehows-web/utils/api';
import { datasetUrlById, datasetUrlByUrn } from 'wherehows-web/utils/api/datasets/shared';
import {
  IComplianceGetResponse,
  IComplianceInfo,
  IComplianceSuggestion,
  IComplianceSuggestionResponse
} from 'wherehows-web/typings/api/datasets/compliance';
import { getJSON, postJSON } from 'wherehows-web/utils/api/fetcher';
import { saveDatasetRetentionByUrn } from 'wherehows-web/utils/api/datasets/retention';
import {
  extractRetentionFromComplianceInfo,
  nullifyRetentionFieldsOnComplianceInfo
} from 'wherehows-web/utils/datasets/retention';

/**
 * Constructs the dataset compliance url
 * @param {number} id the id of the dataset
 * @return {string} the dataset compliance url
 */
const datasetComplianceUrlById = (id: number): string => `${datasetUrlById(id)}/compliance`;

/**
 * Returns the url for a datasets compliance policy by urn
 * @param {string} urn
 * @return {string}
 */
const datasetComplianceUrlByUrn = (urn: string): string => `${datasetUrlByUrn(urn)}/compliance`;

/**
 * Constructs the compliance suggestions url based of the compliance id
 * @param {number} id the id of the dataset
 * @return {string} compliance suggestions url
 */
const datasetComplianceSuggestionsUrlById = (id: number): string => `${datasetComplianceUrlById(id)}/suggestions`;

/**
 * Returns the url for a dataset compliance suggestion by urn
 * @param {string} urn
 * @return {string}
 */
const datasetComplianceSuggestionUrlByUrn = (urn: string): string => `${datasetUrlByUrn(urn)}/compliance/suggestion`;

/**
 * Returns the url for a dataset compliance suggestion feedback by urn
 * @param {string} urn the urn for the dataset
 * @return {string}
 */
const datasetComplianceSuggestionFeedbackUrlByUrn = (urn: string): string =>
  `${datasetComplianceSuggestionUrlByUrn(urn)}/feedback`;

/**
 * Describes the properties on a map generated by reading the compliance policy for a dataset
 * @interface
 */
export interface IReadComplianceResult {
  isNewComplianceInfo: boolean;
  complianceInfo: IComplianceInfo;
}

/**
 * Reads the dataset compliance policy by urn.
 * Resolves with a new compliance policy instance if remote response is ApiResponseStatus.NotFound
 * @param {string} urn the urn for the related dataset
 * @return {Promise<IReadComplianceResult>}
 */
const readDatasetComplianceByUrn = async (urn: string): Promise<IReadComplianceResult> => {
  let complianceInfo: IComplianceGetResponse['complianceInfo'] = initialComplianceObjectFactory(urn);
  let isNewComplianceInfo = false;

  try {
    ({ complianceInfo } = await getJSON<Pick<IComplianceGetResponse, 'complianceInfo'>>({
      url: datasetComplianceUrlByUrn(urn)
    }));
  } catch (e) {
    if (isNotFoundApiError(e)) {
      complianceInfo = initialComplianceObjectFactory(urn);
      isNewComplianceInfo = true;
    } else {
      throw e;
    }
  }

  return { isNewComplianceInfo, complianceInfo: complianceInfo! };
};

/**
 * Persists the dataset compliance policy
 * @param {string} urn
 * @param {IComplianceInfo} complianceInfo
 * @return {Promise<void>}
 */
const saveDatasetComplianceByUrn = async (urn: string, complianceInfo: IComplianceInfo): Promise<void> => {
  await postJSON<void>({
    url: datasetComplianceUrlByUrn(urn),
    data: nullifyRetentionFieldsOnComplianceInfo(complianceInfo)
  });
  await saveDatasetRetentionByUrn(urn, extractRetentionFromComplianceInfo(complianceInfo));
};

/**
 * Requests the compliance suggestions for a given dataset Id and returns the suggestion list
 * @param {number} id the id of the dataset
 * @return {Promise<IComplianceSuggestion>}
 */
const readDatasetComplianceSuggestion = async (id: number): Promise<IComplianceSuggestion> => {
  const { complianceSuggestion = <IComplianceSuggestion>{} } = await getJSON<IComplianceSuggestionResponse>({
    url: datasetComplianceSuggestionsUrlById(id)
  });

  return complianceSuggestion;
};

/**
 * Reads the suggestions for a dataset compliance policy by urn
 * @param {string} urn
 * @return {Promise<IComplianceSuggestion>}
 */
const readDatasetComplianceSuggestionByUrn = async (urn: string): Promise<IComplianceSuggestion> => {
  let complianceSuggestion: IComplianceSuggestion = <IComplianceSuggestion>{};

  try {
    ({ complianceSuggestion = <IComplianceSuggestion>{} } = await getJSON<
      Pick<IComplianceSuggestionResponse, 'complianceSuggestion'>
    >({ url: datasetComplianceSuggestionUrlByUrn(urn) }));
  } catch {
    return complianceSuggestion;
  }

  return complianceSuggestion;
};

/**
 * Saves the suggestion feedback for a dataset when selected by the user
 * @param {string} urn the urn for the dataset with suggestions
 * @param {string | null} uid the suggestion uid
 * @param {SuggestionIntent} feedback indicator for acceptance or discarding a suggestion
 * @return {Promise<void>}
 */
const saveDatasetComplianceSuggestionFeedbackByUrn = (
  urn: string,
  uid: string | null,
  feedback: SuggestionIntent
): Promise<void> => postJSON<void>({ url: datasetComplianceSuggestionFeedbackUrlByUrn(urn), data: { uid, feedback } });

export {
  readDatasetComplianceSuggestion,
  datasetComplianceUrlById,
  readDatasetComplianceByUrn,
  saveDatasetComplianceByUrn,
  readDatasetComplianceSuggestionByUrn,
  saveDatasetComplianceSuggestionFeedbackByUrn
};
